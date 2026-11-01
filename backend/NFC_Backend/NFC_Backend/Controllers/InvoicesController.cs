using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
using NFC_Backend.MidlleWares;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;
using System.Security.Claims;

namespace NFC_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class InvoicesController : ControllerBase
    {
        private readonly ITenantRepo _tenantRepo;
        private readonly IUserRepo _userRepo;
        private readonly ILogger<InvoicesController> _logger;
        private readonly IOrderRepo _orderRepo;
        private readonly IinvoiceRepo _invoiceRepo;
        private readonly IPaymentMethodsRepo _paymentMethods;
        private readonly ICategoryTranslationService _translation;
        private readonly ILanguageAccessor _languageAccessor;
        private readonly ICurrencyAccessor _currencyAccessor;

        public InvoicesController(
            IPaymentMethodsRepo paymentMethods,
            ITenantRepo tenantRepo,
            IUserRepo userRepo,
            ILogger<InvoicesController> logger,
            IOrderRepo orderRepo,
            IinvoiceRepo invoiceRepo,
            ICategoryTranslationService translation,
            ILanguageAccessor languageAccessor,
            ICurrencyAccessor currencyAccessor)
        {
            _tenantRepo = tenantRepo;
            _userRepo = userRepo;
            _logger = logger;
            _orderRepo = orderRepo;
            _invoiceRepo = invoiceRepo;
            _translation = translation;
            _languageAccessor = languageAccessor;
            _currencyAccessor = currencyAccessor;
            _paymentMethods = paymentMethods;
        }

        //[HttpPost("Pay")]
        //        [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        //public async Task<ActionResult> PayTheOrder(PayInvoiceRequest request , CancellationToken ct)
        //{
        //    var tenantId = User.GetTenantId();
        //    try
        //    {
        //        if (tenantId == null)
        //        {
        //            _logger.LogWarning("DeleteStatus failed - TenantId claim missing from token");
        //            return Unauthorized(new { error = "Invalid token." });
        //        }

        //        var currentUser = User.GetUserId();

        //        if(currentUser == null)
        //        {
        //            _logger.LogWarning("DeleteStatus failed - TenantId claim missing from token");
        //            return Unauthorized(new { error = "Invalid token." });

        //        }

        //        var CurrentOrder = await _orderRepo.GetOrderByIdAsync(request.OrderId, tenantId.Value, ct);

        //        if(CurrentOrder == null)
        //        {
        //            _logger.LogWarning("DeleteStatus failed - TenantId claim missing from token");
        //            return NotFound(new { error = "Invalid token." });
        //        }
        //        if(CurrentOrder.PaymentStatusId == 2)
        //        {
        //            _logger.LogWarning("is paid failed - TenantId claim missing from token");
        //            return BadRequest(new { error = "Invalid token." });
        //        }

        //        var currentPaymentMethod = await _paymentMethods.GetByIdAsync(tenantId.Value, request.PaymentMethod, _languageAccessor.Current, ct);

        //        if

        //    }
        //    catch (NotFoundException ex)
        //    {
        //        _logger.LogWarning(ex.Message);
        //        return NotFound(new { error = ex.Message });
        //    }
        //    catch (Exception ex)
        //    {
        //        _logger.LogError(ex, "GetSimpleInfos unexpected error");
        //        return StatusCode(500, new { error = "An unexpected error occurred." });
        //    }


        //}
    }
}