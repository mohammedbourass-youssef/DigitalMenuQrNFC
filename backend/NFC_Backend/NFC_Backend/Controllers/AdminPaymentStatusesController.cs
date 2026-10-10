using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NFC_Backend.Domain.Constants;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Controllers.Admin
{
    [Route("api/admin/payment-statuses")]
    [ApiController]
    [Authorize(Roles = nameof(UserRole.TenantOwner))]

    public class AdminPaymentStatusesController : ControllerBase
    {
        private readonly IPaymentStatusRepo _repo;
        private readonly ILogger<AdminPaymentStatusesController> _logger;

        public AdminPaymentStatusesController(IPaymentStatusRepo repo, ILogger<AdminPaymentStatusesController> logger)
        {
            _repo = repo;
            _logger = logger;
        }

        // GET api/admin/payment-statuses?includeInactive=true
        [HttpGet]
        public async Task<ActionResult<List<PaymentStatusDto>>> GetAll([FromQuery] bool includeInactive = true, CancellationToken ct = default)
        {
            var list = await _repo.GetAllAsync(includeInactive, ct);
            return Ok(list.Select(ToDto));
        }

        // GET api/admin/payment-statuses/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<PaymentStatusDto>> GetById(int id, CancellationToken ct)
        {
            var s = await _repo.GetByIdAsync(id, ct);
            return s is null ? NotFound() : Ok(ToDto(s));
        }

        // POST api/admin/payment-statuses
        [HttpPost]
        public async Task<ActionResult<PaymentStatusDto>> Create([FromBody] CreatePaymentStatusDto dto, CancellationToken ct)
        {
            var code = dto.Code.Trim();

            if (await _repo.CodeExistsAsync(code, null, ct))
                return Conflict(new { message = $"A status with code '{code}' already exists." });

            var error = ValidateTranslations(dto.Translations);
            if (error is not null) return BadRequest(new { message = error });

            var status = new PaymentStatus
            {
                Code = code,
                Color = dto.Color,
                DisplayOrder = dto.DisplayOrder,
                IsActive = dto.IsActive,
                Translations = MapTranslations(dto.Translations)
            };

            await _repo.AddAsync(status, ct);
            await _repo.SaveChangesAsync(ct);

            return CreatedAtAction(nameof(GetById), new { id = status.Id }, ToDto(status));
        }

        // PUT api/admin/payment-statuses/5
        [HttpPut("{id:int}")]
        public async Task<ActionResult<PaymentStatusDto>> Update(int id, [FromBody] UpdatePaymentStatusDto dto, CancellationToken ct)
        {
            var status = await _repo.GetByIdAsync(id, ct);
            if (status is null) return NotFound();

            // Paid / NotPaid can be restyled and renamed, but never disabled
            if (status.IsSystem && !dto.IsActive)
                return BadRequest(new { message = $"'{status.Code}' is a system status and cannot be disabled." });

            var error = ValidateTranslations(dto.Translations);
            if (error is not null) return BadRequest(new { message = error });

            status.Color = dto.Color;
            status.DisplayOrder = dto.DisplayOrder;
            status.IsActive = dto.IsActive;
            await _repo.ReplaceTranslationsAsync(status, MapTranslations(dto.Translations), ct);

            await _repo.SaveChangesAsync(ct);
            return Ok(ToDto(status));
        }

        // PATCH api/admin/payment-statuses/5/active?value=false
        [HttpPatch("{id:int}/active")]
        public async Task<IActionResult> SetActive(int id, [FromQuery] bool value, CancellationToken ct)
        {
            var status = await _repo.GetByIdAsync(id, ct);
            if (status is null) return NotFound();

            if (status.IsSystem && !value)
                return BadRequest(new { message = $"'{status.Code}' is a system status and cannot be disabled." });

            status.IsActive = value;
            await _repo.SaveChangesAsync(ct);
            return NoContent();
        }

        // DELETE api/admin/payment-statuses/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var status = await _repo.GetByIdAsync(id, ct);
            if (status is null) return NotFound();

            if (status.IsSystem)
                return BadRequest(new { message = $"'{status.Code}' is a system status and cannot be deleted." });

            //if (await _repo.IsInUseAsync(id, ct))
            //    return Conflict(new { message = "This status is used by existing payments. Disable it instead of deleting it." });

            _repo.Remove(status);
            await _repo.SaveChangesAsync(ct);
            return NoContent();
        }

        // ---------- helpers ----------

        private static string? ValidateTranslations(List<PaymentStatusTranslationDto> translations)
        {
            if (translations.Count == 0)
                return "At least one translation is required.";

            if (translations.Select(t => t.Lang.Trim().ToLowerInvariant()).Distinct().Count() != translations.Count)
                return "Duplicate language in translations.";

            if (translations.Any(t => string.IsNullOrWhiteSpace(t.Name)))
                return "Translation names cannot be empty.";

            return null;
        }

        private static List<PaymentStatusTranslation> MapTranslations(IEnumerable<PaymentStatusTranslationDto> dtos) =>
            dtos.Select(t => new PaymentStatusTranslation
            {
                Lang = t.Lang.Trim().ToLowerInvariant(),
                Name = t.Name.Trim()
            }).ToList();

        private static PaymentStatusDto ToDto(PaymentStatus s) => new(
      s.Id, s.Code, s.Color, s.DisplayOrder, s.IsActive, s.IsSystem,
      s.Translations.Select(t => new PaymentStatusTranslationDto(t.Lang, t.Name)).ToList());
    }
}