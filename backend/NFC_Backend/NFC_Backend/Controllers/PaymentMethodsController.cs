using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Extensions;
using NFC_Backend.MidlleWares;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;

namespace NFC_Backend.Controllers
{
    [Route("api/PaymentMethods")]
    [ApiController]
    public class PaymentMethodsController : ControllerBase
    {
        private readonly IPaymentMethodsRepo _repo;
        private readonly ILanguageAccessor _languageAccessor;
        private readonly ILogger<PaymentMethodsController> _logger;

        public PaymentMethodsController(
            IPaymentMethodsRepo repo,
            ILanguageAccessor languageAccessor,
            ILogger<PaymentMethodsController> logger)
        {
            _repo = repo;
            _languageAccessor = languageAccessor;
            _logger = logger;
        }

        // ═════════════════════════════════════════════════════
        //  READS
        // ═════════════════════════════════════════════════════

        /// <summary>System methods for the "Add payment method" dropdown (AlreadyAdded = true => disable option).</summary>
        [HttpGet("System")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        [ProducesResponseType(typeof(List<SystemPaymentMethodDto>), StatusCodes.Status200OK)]
        public Task<ActionResult> GetSystemMethods(CancellationToken ct) =>
            RunAsync(nameof(GetSystemMethods), async tenantId =>
            {
                var result = await _repo.GetSystemMethodsAsync(tenantId, _languageAccessor.Current, ct);
                return Ok(result);
            });

        /// <summary>Full table for the owner: enabled AND disabled methods.</summary>
        [HttpGet]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        [ProducesResponseType(typeof(List<TenantPaymentMethodDto>), StatusCodes.Status200OK)]
        public Task<ActionResult> GetAll(CancellationToken ct) =>
            RunAsync(nameof(GetAll), async tenantId =>
            {
                var result = await _repo.GetTenantMethodsAsync(tenantId, _languageAccessor.Current, onlyEnabled: false, ct);
                return Ok(result);
            });

        /// <summary>Enabled methods only, for the cashier / payment screen. Any authenticated user of the tenant.</summary>
        [HttpGet("Enabled")]
        [Authorize]
        [ProducesResponseType(typeof(List<TenantPaymentMethodDto>), StatusCodes.Status200OK)]
        public Task<ActionResult> GetEnabled(CancellationToken ct) =>
            RunAsync(nameof(GetEnabled), async tenantId =>
            {
                var result = await _repo.GetTenantMethodsAsync(tenantId, _languageAccessor.Current, onlyEnabled: true, ct);
                return Ok(result);
            });

        [HttpGet("{id:int}")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        [ProducesResponseType(typeof(TenantPaymentMethodDto), StatusCodes.Status200OK)]
        public Task<ActionResult> GetById(int id, CancellationToken ct) =>
            RunAsync(nameof(GetById), async tenantId =>
            {
                var dto = await _repo.GetByIdAsync(tenantId, id, _languageAccessor.Current, ct);
                return dto == null ? NotFound(new { error = "Payment method not found." }) : Ok(dto);
            });

        // ═════════════════════════════════════════════════════
        //  WRITES
        // ═════════════════════════════════════════════════════

        /// <summary>Add a system payment method to this tenant (from the pop-up).</summary>
        [HttpPost]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        [ProducesResponseType(typeof(TenantPaymentMethodDto), StatusCodes.Status201Created)]
        public Task<ActionResult> Add([FromBody] AddTenantPaymentMethodRequest request, CancellationToken ct) =>
            RunAsync(nameof(Add), async tenantId =>
            {
                var (result, id) = await _repo.AddAsync(tenantId, request, ct);
                if (result != PaymentMethodResult.Success)
                    return MapError(result);

                var dto = await _repo.GetByIdAsync(tenantId, id, _languageAccessor.Current, ct);
                _logger.LogInformation("PaymentMethods.Add OK. TenantId: {TenantId} | Id: {Id} | SystemId: {SystemId}",
                    tenantId, id, request.PaymentMethodId);
                return CreatedAtAction(nameof(GetById), new { id }, dto);
            });

        /// <summary>Edit custom label and enabled flag.</summary>
        [HttpPut("{id:int}")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        public Task<ActionResult> Update(int id, [FromBody] UpdateTenantPaymentMethodRequest request, CancellationToken ct) =>
            RunAsync(nameof(Update), async tenantId =>
            {
                var result = await _repo.UpdateAsync(tenantId, id, request, ct);
                return result == PaymentMethodResult.Success ? NoContent() : MapError(result);
            });

        /// <summary>Quick enable/disable switch in the table row.</summary>
        [HttpPatch("{id:int}/enabled")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        public Task<ActionResult> SetEnabled(int id, [FromBody] SetEnabledRequest request, CancellationToken ct) =>
            RunAsync(nameof(SetEnabled), async tenantId =>
            {
                var result = await _repo.SetEnabledAsync(tenantId, id, request.IsEnabled, ct);
                return result == PaymentMethodResult.Success ? NoContent() : MapError(result);
            });

        /// <summary>Make this method the tenant's default (auto-enables it, unsets the previous default).</summary>
        [HttpPatch("{id:int}/default")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        public Task<ActionResult> SetDefault(int id, CancellationToken ct) =>
            RunAsync(nameof(SetDefault), async tenantId =>
            {
                var result = await _repo.SetDefaultAsync(tenantId, id, ct);
                return result == PaymentMethodResult.Success ? NoContent() : MapError(result);
            });

        /// <summary>Drag &amp; drop ordering. Send ALL tenant method ids in the new order.</summary>
        [HttpPut("reorder")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        public Task<ActionResult> Reorder([FromBody] ReorderPaymentMethodsRequest request, CancellationToken ct) =>
            RunAsync(nameof(Reorder), async tenantId =>
            {
                var result = await _repo.ReorderAsync(tenantId, request.OrderedIds, ct);
                return result == PaymentMethodResult.Success ? NoContent() : MapError(result);
            });

        [HttpDelete("{id:int}")]
        [Authorize(Roles = nameof(UserRole.TenantOwner))]
        public Task<ActionResult> Delete(int id, CancellationToken ct) =>
            RunAsync(nameof(Delete), async tenantId =>
            {
                var result = await _repo.DeleteAsync(tenantId, id, ct);
                return result == PaymentMethodResult.Success ? NoContent() : MapError(result);
            });

        // ═════════════════════════════════════════════════════
        //  HELPERS
        // ═════════════════════════════════════════════════════

        private async Task<ActionResult> RunAsync(string action, Func<Guid, Task<ActionResult>> body)
        {
            var tenantId = User.GetTenantId();
            if (tenantId == null)
            {
                _logger.LogWarning("PaymentMethods.{Action} failed - TenantId claim missing from token", action);
                return Unauthorized(new { error = "Invalid token." });
            }

            try
            {
                return await body(tenantId.Value);
            }
            catch (OperationCanceledException)
            {
                return StatusCode(499);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in PaymentMethods.{Action}. TenantId: {TenantId}", action, tenantId);
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        // The "code" field lets the frontend show a translated message.
        private ActionResult MapError(PaymentMethodResult result) => result switch
        {
            PaymentMethodResult.NotFound =>
                NotFound(new { code = "NOT_FOUND", error = "Payment method not found." }),
            PaymentMethodResult.Duplicate =>
                Conflict(new { code = "DUPLICATE", error = "This payment method is already added." }),
            PaymentMethodResult.InvalidSystemMethod =>
                BadRequest(new { code = "INVALID_SYSTEM_METHOD", error = "Selected payment method is not available." }),
            PaymentMethodResult.LastEnabledMethod =>
                BadRequest(new { code = "LAST_ENABLED", error = "At least one payment method must stay enabled." }),
            PaymentMethodResult.InvalidOrder =>
                BadRequest(new { code = "INVALID_ORDER", error = "The ordering list does not match your payment methods." }),
            _ => StatusCode(500, new { error = "An unexpected error occurred." })
        };
    }
}