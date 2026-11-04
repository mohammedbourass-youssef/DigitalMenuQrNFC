using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using NFC_Backend.Domain.Constants;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
using NFC_Backend.MidlleWares;
using NFC_Backend.Repos.Implementations;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TablesController : ControllerBase
    {
        private readonly ITableRepo _tableRepo;
        private readonly ILogger<TablesController> _logger;
        private readonly IPlanRepo _PlanRepo;
        private readonly ITenantRepo _tenantRepo;
        private readonly IConfiguration _configuration;

        public TablesController(ITableRepo tableRepo, ILogger<TablesController> logger , IPlanRepo planRepo , ITenantRepo tenantRepo, IConfiguration configuration)
        {
            _tableRepo = tableRepo;
            _logger = logger;
            _PlanRepo = planRepo;
            _tenantRepo = tenantRepo;
            _configuration = configuration;
        }

        [HttpGet]
        [Authorize]
        [HasPermission(FeatureCodes.Tables, EnPermissionActions.READ)]
        public async Task<ActionResult<List<TableResponseDTO>>> GetAll()
        {
            try
            {
                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("GetAll tables failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                var tables = await _tableRepo.GetAllByTenantAsync(tenantId.Value);

                var result = tables.Select(t => new TableResponseDTO
                {
                    Id = t.Id,
                    Number = t.Number,
                    Name = t.Name,
                    IsAvailable = t.IsAvailable,
                    QrCodeUrl = t.QrCodeUrl
                }).ToList();

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in GetAll tables");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred. Please try again." });
            }
        }

        [HttpGet("{id:guid}")]
        [Authorize]
        [HasPermission(FeatureCodes.Tables, EnPermissionActions.READ)]
        public async Task<ActionResult<TableResponseDTO>> GetById(Guid id)
        {
            try
            {
                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("GetById table failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                var table = await _tableRepo.GetByIdAsync(id, tenantId.Value);
                if (table == null)
                {
                    _logger.LogWarning("Table not found. Id: {Id}, TenantId: {TenantId}", id, tenantId);
                    return NotFound(new { error = "Table not found." });
                }

                return Ok(new TableResponseDTO
                {
                    Id = table.Id,
                    Number = table.Number,
                    Name = table.Name,
                    IsAvailable = table.IsAvailable,
                    QrCodeUrl = table.QrCodeUrl
                });
            }
            catch (NotFoundException ex)
            {
                _logger.LogWarning(ex.Message);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in GetById table. Id: {Id}", id);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred. Please try again." });
            }
        }

        [HttpPost]
        [Authorize]
        [HasPermission(FeatureCodes.Tables, EnPermissionActions.WRITE)]
        public async Task<ActionResult<TableResponseDTO>> Create([FromBody] CreateTableDTO dto)
        {
            try
            {
                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("Create table failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                _logger.LogInformation("Create table started for TenantId: {TenantId}", tenantId);

                var tenant = await _tenantRepo.GetByID(tenantId.Value);
                if (tenant == null)
                {
                    _logger.LogWarning("Create table failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { code = "TENANT_NOT_FOUND", message = "Restaurant not found." });      // 404
                }
                var quota = await _PlanRepo.GetPlanQuotaAsync(tenant.PlanId, tenantId.Value);
                if (quota is null)
                {
                    _logger.LogWarning(
                        "Create table failed - active plan not found. TenantId: {TenantId}, PlanId: {PlanId}",
                        tenantId, tenant.PlanId);

                    return NotFound(new { code = "PLAN_NOT_FOUND", message = "Active plan not found." });      // 404
                }

                if (!quota.Tables.CanAdd)
                {
                    _logger.LogInformation(
                        "Create table blocked - limit reached. TenantId: {TenantId}, Plan: {Plan}, Used: {Used}, Max: {Max}",
                        tenantId, quota.Name, quota.Tables.Used, quota.Tables.Max);

                    return StatusCode(StatusCodes.Status403Forbidden, new                                       // 403
                    {
                        code = "TABLE_LIMIT_REACHED",
                        message = "Table limit reached for your plan.",
                        current = quota.Tables.Used,
                        limit = quota.Tables.Max
                    });
                }

                if (await _tableRepo.NumberExistsAsync(tenantId.Value, dto.Number))
                {
                    return BadRequest(new { error = "A table with this number already exists." });
                }
                if (await _tableRepo.NumberExistsAsync(tenantId.Value, dto.Number))
                {
                    return BadRequest(new { error = "A table with this number already exists." });
                }

                var table = new Table
                {
                    Id = Guid.NewGuid(),
                    TenantId = tenantId.Value,
                    Number = dto.Number,
                    Name = dto.Name,
                    IsAvailable = dto.IsAvailable
                };

                await _tableRepo.CreateAsync(table);
                _logger.LogInformation("Table created for TenantId: {TenantId}, TableId: {TableId}",
                    tenantId, table.Id);

                return Ok(new TableResponseDTO
                {
                    Id = table.Id,
                    Number = table.Number,
                    Name = table.Name,
                    IsAvailable = table.IsAvailable,
                    QrCodeUrl = table.QrCodeUrl
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in Create table for TenantId: {TenantId}",
                    User.GetTenantId());
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred. Please try again." });
            }
        }

        // GET api/tables/{id}/qr
        [HttpGet("{id:guid}/qr")]
        [Authorize]
        [HasPermission(FeatureCodes.Tables, EnPermissionActions.READ)]
        public async Task<IActionResult> GetQrCode(Guid id)
        {
            try
            {
                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("GetQrCode failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                var baseDomain = _configuration["AppSettings:BaseDomain"]?.Trim().TrimStart('.');
                if (string.IsNullOrEmpty(baseDomain))
                {
                    _logger.LogWarning("GetQrCode failed - AppSettings:BaseDomain not configured");
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new { error = "QR code base domain not configured." });
                }

                var qrUrl = await _tableRepo.GenerateQrCodeUrlAsync(id, tenantId.Value, baseDomain);
                if (qrUrl is null)
                {
                    _logger.LogWarning("GetQrCode failed - table not found. Id: {Id}, TenantId: {TenantId}", id, tenantId);
                    return NotFound(new { error = "Table not found." });
                }

                return Ok(new { qrCodeUrl = qrUrl, qrData = qrUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in GetQrCode. Id: {Id}", id);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred. Please try again." });
            }
        }

        // POST api/tables/{id}/qr/generate
        [HttpPost("{id:guid}/qr/generate")]
        [Authorize]
        [HasPermission(FeatureCodes.Tables, EnPermissionActions.UPDATE)]
        public async Task<IActionResult> GenerateQrCode(Guid id)
        {
            try
            {
                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("GenerateQrCode failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                var baseDomain = _configuration["AppSettings:BaseDomain"]?.Trim().TrimStart('.');
                if (string.IsNullOrEmpty(baseDomain))
                {
                    _logger.LogWarning("GenerateQrCode failed - AppSettings:BaseDomain not configured");
                    return StatusCode(StatusCodes.Status500InternalServerError,
                        new { error = "QR code base domain not configured." });
                }

                var qrUrl = await _tableRepo.GenerateQrCodeUrlAsync(id, tenantId.Value, baseDomain);
                if (qrUrl is null)
                {
                    _logger.LogWarning("GenerateQrCode failed - table not found. Id: {Id}, TenantId: {TenantId}", id, tenantId);
                    return NotFound(new { error = "Table not found." });
                }

                return Ok(new { qrCodeUrl = qrUrl, qrData = qrUrl });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in GenerateQrCode. Id: {Id}", id);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred. Please try again." });
            }
        }

        [HttpPut]
        [Authorize]
        [HasPermission(FeatureCodes.Tables, EnPermissionActions.UPDATE)]
        public async Task<ActionResult> Update([FromBody] UpdateTableDTO dto)
        {
            try
            {
                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("Update table failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                var table = await _tableRepo.GetByIdAsync(dto.Id, tenantId.Value);
                if (table == null)
                {
                    _logger.LogWarning("Update table failed - not found. Id: {Id}, TenantId: {TenantId}",
                        dto.Id, tenantId);
                    return NotFound(new { error = "Table not found." });
                }

                if (await _tableRepo.NumberExistsAsync(tenantId.Value, dto.Number, dto.Id))
                {
                    return BadRequest(new { error = "A table with this number already exists." });
                }

                _logger.LogInformation("Update table started for TenantId: {TenantId}, TableId: {TableId}",
                    tenantId, dto.Id);

                table.Number = dto.Number;
                table.Name = dto.Name;
                table.IsAvailable = dto.IsAvailable;

                await _tableRepo.UpdateAsync(table);
                _logger.LogInformation("Table updated successfully. TableId: {TableId}", dto.Id);

                return Ok(new { message = "Table updated successfully." });
            }
            catch (NotFoundException ex)
            {
                _logger.LogWarning(ex.Message);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in Update table");
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred. Please try again." });
            }
        }

        [HttpDelete("{id:guid}")]
        [Authorize]
        [HasPermission(FeatureCodes.Tables, EnPermissionActions.DELETE)]
        public async Task<ActionResult> Delete(Guid id)
        {
            try
            {
                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("Delete table failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                var table = await _tableRepo.GetByIdAsync(id, tenantId.Value);
                if (table == null)
                {
                    _logger.LogWarning("Delete table failed - not found. Id: {Id}, TenantId: {TenantId}",
                        id, tenantId);
                    return NotFound(new { error = "Table not found." });
                }

                await _tableRepo.DeleteAsync(table);
                _logger.LogInformation("Table deleted. TableId: {TableId}, TenantId: {TenantId}", id, tenantId);

                return Ok(new { message = "Table deleted successfully." });
            }
            catch (NotFoundException ex)
            {
                _logger.LogWarning(ex.Message);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in Delete table. Id: {Id}", id);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred. Please try again." });
            }
        }
    }
}
