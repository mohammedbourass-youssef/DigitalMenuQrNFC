using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NFC_Backend.Controllers.Admin;
using NFC_Backend.Domain.Constants;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Extensions;
using NFC_Backend.MidlleWares;
using NFC_Backend.Repos.Implementations;
using NFC_Backend.Repos.Interfaces;
using System.Security.Claims;
using System.Threading.Tasks;

namespace NFC_Backend.Controllers
{
    [Route("api/Plans")]
    [ApiController]
    //[Authorize(Roles = nameof(UserRole.SuperAdmin))]
    public class PlansController : ControllerBase
    {
        private readonly IPlanRepo _repo;
        private readonly ITenantRepo _tenantRepo;
        private readonly ILogger<PlansController> _logger;
        private readonly ICurrencyAccessor _currency;
        public PlansController(IPlanRepo repo, ILogger<PlansController> logger, ITenantRepo tenantRepo , ICurrencyAccessor currency)
        {
            _repo = repo;
            _logger = logger;
            _tenantRepo = tenantRepo;
            _currency = currency;
        }

        [HttpGet("PlanInformations")]
                [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Subscription, EnPermissionActions.READ)]
        [ProducesResponseType(typeof(TenantPlanInformations), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<TenantPlanInformations>> GetPlanInformationsAsync()
        {
            var tenantId = User.GetTenantId();
            if (tenantId == null)
            {
                _logger.LogWarning("GetPlanInformations failed - TenantId claim missing from token.");
                return Unauthorized(new { error = "Invalid token." });
            }

            try
            {
                var result = await _repo.GetTenantPlanInformationsAsync(tenantId.Value);

                if (result == null)
                {
                    _logger.LogWarning("GetPlanInformations - no plan information found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Plan information not found for this restaurant." });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetPlanInformations failed. TenantId: {TenantId}", tenantId);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred." });
            }
        }


        [HttpGet("AllPlans")]
                [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Subscription, EnPermissionActions.READ)]
        [ProducesResponseType(typeof(List<PlanPricingDto>), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        [ProducesResponseType(StatusCodes.Status500InternalServerError)]
        public async Task<ActionResult<List<PlanPricingDto>>> GetAll(
      [FromQuery] AllPlansRequest request, CancellationToken ct)
        {
            var tenantId = User.GetTenantId();
            if (tenantId == null)
            {
                _logger.LogWarning("AllPlans failed - TenantId claim missing from token.");
                return Unauthorized(new { error = "Invalid token." });
            }

            try
            {
                var tenant = await _tenantRepo.GetByID(tenantId.Value);
                if (tenant == null)
                {
                    _logger.LogWarning("AllPlans failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                var plans = await _repo.GetAvailablePricingPlansAsync(
                    tenant.PlanId, request.PaymentType, _currency.Current, ct);

                return Ok(plans);
            }
            catch (OperationCanceledException)
            {
                // Client disconnected; nothing to return.
                _logger.LogInformation("AllPlans cancelled. TenantId: {TenantId}", tenantId);
                return StatusCode(StatusCodes.Status499ClientClosedRequest);
            }
            catch (InvalidOperationException ex)
            {
                // e.g. missing exchange rate thrown by the repository
                _logger.LogError(ex, "AllPlans failed - pricing data problem. TenantId: {TenantId}", tenantId);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "Pricing information is currently unavailable." });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "AllPlans failed. TenantId: {TenantId}", tenantId);
                return StatusCode(StatusCodes.Status500InternalServerError,
                    new { error = "An unexpected error occurred." });
            }
        }


        [HttpGet("Quota")]
                [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Subscription, EnPermissionActions.READ)]
        public async Task<ActionResult<PlanQuotaDTo>> GetPlanQuota(CancellationToken ct)
        {
            var tenantId = User.GetTenantId();
            if (tenantId is null)
                return Unauthorized(new { error = "Invalid token." });

            var tenant = await _tenantRepo.GetByID(tenantId.Value);
            if (tenant is null)
                return NotFound(new { error = "Restaurant not found." });

            var quota = await _repo.GetPlanQuotaAsync(tenant.PlanId, tenantId.Value, ct);
            if (quota is null)
                return NotFound(new { error = "Active plan not found." });

            return Ok(quota);
        }
    }
}
