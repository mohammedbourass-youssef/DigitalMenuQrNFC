using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
using NFC_Backend.Repos.Interfaces;

namespace NFC_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TablesController : ControllerBase
    {
        private readonly ITableRepo _tableRepo;
        private readonly ILogger<TablesController> _logger;

        public TablesController(ITableRepo tableRepo, ILogger<TablesController> logger)
        {
            _tableRepo = tableRepo;
            _logger = logger;
        }

        [HttpGet]
        [Authorize]
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
                    IsAvailable = t.IsAvailable
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
                    IsAvailable = table.IsAvailable
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
                    IsAvailable = table.IsAvailable
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

        [HttpPut]
        [Authorize]
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
