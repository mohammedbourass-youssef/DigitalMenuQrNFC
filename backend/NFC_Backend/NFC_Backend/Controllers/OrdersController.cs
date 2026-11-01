using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NFC_Backend.Domain.Constants;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
using NFC_Backend.MidlleWares;
using NFC_Backend.Repos.Implementations;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;
using System.Diagnostics;
using System.Security.Claims;

namespace NFC_Backend.Controllers
{
    [Route("api/Orders")]
    [ApiController]
    public class OrdersController : ControllerBase
    {
        private readonly ITenantRepo _tenantRepo;
        private readonly IUserRepo _userRepo;
        private readonly ILogger<OrdersController> _logger;
        private readonly IOrderRepo _orderRepo;
        private readonly ICategoryTranslationService _translation;
        private readonly ILanguageAccessor _languageAccessor;
        private readonly ICurrencyAccessor _CurrencyAccessor;
        private readonly IPaymentMethodsRepo _paymentMethodsRepo;
        private readonly IinvoiceRepo _invoiceRepo;
        public OrdersController(ITenantRepo tenantRepo, IUserRepo userRepo, 
            ILogger<OrdersController> logger, IOrderRepo orderRepo, IinvoiceRepo iinvoice, IPaymentMethodsRepo paymentMethods , ICategoryTranslationService translation , ILanguageAccessor languageAccessor , ICurrencyAccessor currencyAccessor)
        {
            _tenantRepo = tenantRepo;
            _userRepo = userRepo;
            _logger = logger;
            _orderRepo = orderRepo;
            _translation = translation;
            _languageAccessor = languageAccessor;
            _CurrencyAccessor = currencyAccessor;
            _paymentMethodsRepo = paymentMethods;
            _invoiceRepo = iinvoice;
        }
        [HttpPost("NewStatus")]
                [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Orders, EnPermissionActions.WRITE)]
        public async Task<ActionResult> CreateStatus(CreateNewStatusRequest request)
        {
            var sw = Stopwatch.StartNew();
            Guid? tenantIdForLog = User.GetTenantId();

            try
            {
                _logger.LogInformation(
                    "CreateStatus started. TenantId: {TenantId} | Code: {Code} | Color: {Color} | DisplayOrder: {DisplayOrder}",
                    tenantIdForLog, request.Code, request.Color, request.DisplayOrder);

                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
                {
                    _logger.LogWarning("CreateStatus failed - invalid or missing userId in token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                User user = await _userRepo.GetUserByID(userId);
                if (user == null)
                {
                    _logger.LogWarning("CreateStatus failed - user not found. UserId: {UserId}", userId);
                    return NotFound(new { error = "User not found." });
                }
                _logger.LogDebug("CreateStatus - user loaded. UserId: {UserId}", userId);

                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("CreateStatus failed - TenantId claim missing from token. UserId: {UserId}", userId);
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await _tenantRepo.GetByID(tenantId.Value);
                if (tenant == null)
                {
                    _logger.LogWarning("CreateStatus failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }
                _logger.LogDebug("CreateStatus - tenant loaded. TenantId: {TenantId}", tenantId);

                // Translate
                _logger.LogInformation(
                    "CreateStatus - translating status name. TenantId: {TenantId} | Code: {Code}",
                    tenantId, request.Code);

                var translated = await _translation.TranslateStatusNameAsync(request.Code);

                _logger.LogInformation(
                    "CreateStatus - translation completed. TenantId: {TenantId} | Languages: {Count} | EnglishName: {EnName}",
                    tenantId, translated.Count, translated["en"]);

                // Create status
                var status = new OrderStatus
                {
                    Color = request.Color,
                    IsActive = true,
                    DisplayOrder = request.DisplayOrder,
                    Code = translated["en"],
                    TenantId = tenantId.Value,
                };

                var statusId = await _orderRepo.CreateNewStatusAsync(status);
                _logger.LogInformation(
                    "CreateStatus - status created. TenantId: {TenantId} | StatusId: {StatusId} | Code: {Code}",
                    tenantId, statusId, status.Code);

                // Save translations
                var translations = new List<OrderStatusTranslation>(translated.Count);
                foreach (var (lang, localized) in translated)
                {
                    translations.Add(new OrderStatusTranslation
                    {
                        Name = localized,
                        Lang = lang,
                        OrderStatusId = statusId
                    });
                }

                await _orderRepo.SaveTransaltions(translations);
                _logger.LogInformation(
                    "CreateStatus - translations saved. StatusId: {StatusId} | Count: {Count}",
                    statusId, translations.Count);

                sw.Stop();
                _logger.LogInformation(
                    "CreateStatus completed successfully. TenantId: {TenantId} | StatusId: {StatusId} | ElapsedMs: {Elapsed}",
                    tenantId, statusId, sw.ElapsedMilliseconds);

                return Created();
            }
            catch (NotFoundException ex)
            {
                _logger.LogWarning(ex, "CreateStatus failed - not found. TenantId: {TenantId}", tenantIdForLog);
                return NotFound(new { error = ex.Message });
            }
            catch (BadRequestException ex)
            {
                _logger.LogWarning(ex, "CreateStatus failed - bad request. TenantId: {TenantId}", tenantIdForLog);
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Unexpected error in CreateStatus. TenantId: {TenantId} | ElapsedMs: {Elapsed}",
                    tenantIdForLog, sw.ElapsedMilliseconds);
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
        [HttpPost("Fast/NewStatus")]
                [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Orders, EnPermissionActions.WRITE)]
        public async Task<ActionResult> CreateStatusFast([FromBody]string request)
        {
            var sw = Stopwatch.StartNew();
            Guid? tenantIdForLog = User.GetTenantId();

            try
            {
                
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
                {
                    _logger.LogWarning("CreateStatus failed - invalid or missing userId in token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                User user = await _userRepo.GetUserByID(userId);
                if (user == null)
                {
                    _logger.LogWarning("CreateStatus failed - user not found. UserId: {UserId}", userId);
                    return NotFound(new { error = "User not found." });
                }
                _logger.LogDebug("CreateStatus - user loaded. UserId: {UserId}", userId);

                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("CreateStatus failed - TenantId claim missing from token. UserId: {UserId}", userId);
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await _tenantRepo.GetByID(tenantId.Value);
                if (tenant == null)
                {
                    _logger.LogWarning("CreateStatus failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }
                _logger.LogDebug("CreateStatus - tenant loaded. TenantId: {TenantId}", tenantId);

                var translated = await _translation.TranslateStatusNameAsync(request);

                _logger.LogInformation(
                    "CreateStatus - translation completed. TenantId: {TenantId} | Languages: {Count} | EnglishName: {EnName}",
                    tenantId, translated.Count, translated["en"]);

                var LastId = await _orderRepo.GetNextStatusOrderAsync(tenant.Id);
                // Create status
                var status = new OrderStatus
                {
                    Color = "#3B82F6",
                    IsActive = true,
                    DisplayOrder = LastId,
                    Code = translated["en"],
                    TenantId = tenantId.Value,
                };

                var statusId = await _orderRepo.CreateNewStatusAsync(status);
                _logger.LogInformation(
                    "CreateStatus - status created. TenantId: {TenantId} | StatusId: {StatusId} | Code: {Code}",
                    tenantId, statusId, status.Code);

                // Save translations
                var translations = new List<OrderStatusTranslation>(translated.Count);
                foreach (var (lang, localized) in translated)
                {
                    translations.Add(new OrderStatusTranslation
                    {
                        Name = localized,
                        Lang = lang,
                        OrderStatusId = statusId
                    });
                }

                await _orderRepo.SaveTransaltions(translations);
                _logger.LogInformation(
                    "CreateStatus - translations saved. StatusId: {StatusId} | Count: {Count}",
                    statusId, translations.Count);

                sw.Stop();
                _logger.LogInformation(
                    "CreateStatus completed successfully. TenantId: {TenantId} | StatusId: {StatusId} | ElapsedMs: {Elapsed}",
                    tenantId, statusId, sw.ElapsedMilliseconds);

                return Created();
            }
            catch (NotFoundException ex)
            {
                _logger.LogWarning(ex, "CreateStatus failed - not found. TenantId: {TenantId}", tenantIdForLog);
                return NotFound(new { error = ex.Message });
            }
            catch (BadRequestException ex)
            {
                _logger.LogWarning(ex, "CreateStatus failed - bad request. TenantId: {TenantId}", tenantIdForLog);
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Unexpected error in CreateStatus. TenantId: {TenantId} | ElapsedMs: {Elapsed}",
                    tenantIdForLog, sw.ElapsedMilliseconds);
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
        [HttpGet("Statuses")]
        [HasPermission(FeatureCodes.Orders, EnPermissionActions.READ)]

        public async Task<ActionResult<List<OrderStatusDto>>> GetStatuses(
    [FromQuery] string lang = "en",
    CancellationToken ct = default)
        {
            try
            {
                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("GetStatuses failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                lang = string.IsNullOrWhiteSpace(lang) ? "en" : lang.Trim().ToLowerInvariant();

                _logger.LogInformation(
                    "GetStatuses started. TenantId: {TenantId} | Lang: {Lang}", tenantId, lang);

                var statuses = await _orderRepo.GetStatusesAsync(tenantId.Value, lang, ct);

                _logger.LogInformation(
                    "GetStatuses completed. TenantId: {TenantId} | Lang: {Lang} | Count: {Count}",
                    tenantId, lang, statuses.Count);

                return Ok(statuses);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in GetStatuses. TenantId: {TenantId}", User.GetTenantId());
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
        [HttpPut("Status/{id:int}")]
                [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Orders, EnPermissionActions.UPDATE)]
        public async Task<ActionResult> UpdateStatus(int id, UpdateStatusRequest request, CancellationToken ct)
        {
            var tenantId = User.GetTenantId();
            try
            {
                if (tenantId == null)
                {
                    _logger.LogWarning("UpdateStatus failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                _logger.LogInformation(
                    "UpdateStatus started. TenantId: {TenantId} | StatusId: {StatusId} | Name: {Name}",
                    tenantId, id, request.Name);

                var status = await _orderRepo.GetStatusByIdAsync(id, ct);
                if (status == null)
                {
                    _logger.LogWarning("UpdateStatus failed - status not found. StatusId: {StatusId}", id);
                    return NotFound(new { error = "Status not found." });
                }

                if (status.TenantId == null)
                {
                    _logger.LogWarning("UpdateStatus blocked - global status. StatusId: {StatusId} | TenantId: {TenantId}", id, tenantId);
                    return StatusCode(403, new { error = "System statuses cannot be modified." });
                }

                if (status.TenantId != tenantId)
                {
                    // Don't reveal that it exists for another tenant
                    _logger.LogWarning("UpdateStatus failed - tenant mismatch. StatusId: {StatusId} | TenantId: {TenantId}", id, tenantId);
                    return NotFound(new { error = "Status not found." });
                }

                var name = request.Name.Trim();
                var nameChanged = !string.Equals(name, status.Code, StringComparison.OrdinalIgnoreCase);

                List<OrderStatusTranslation>? newTranslations = null;

                if (nameChanged)
                {
                    var translated = await _translation.TranslateStatusNameAsync(name, ct: ct);
                    var englishName = translated["en"];

                    // Check if the name exists BEFORE saving anything
                    if (await _orderRepo.StatusCodeExistsAsync(tenantId.Value, englishName, excludeId: id, ct))
                    {
                        _logger.LogWarning(
                            "UpdateStatus failed - name already exists. TenantId: {TenantId} | Name: {Name}",
                            tenantId, englishName);
                        return BadRequest(new { error = $"A status named '{englishName}' already exists." });
                    }

                    status.Code = englishName;
                    newTranslations = translated
                        .Select(kv => new OrderStatusTranslation
                        {
                            OrderStatusId = status.Id,
                            Lang = kv.Key,
                            Name = kv.Value
                        })
                        .ToList();

                    _logger.LogInformation("UpdateStatus - name changed. StatusId: {StatusId} | NewCode: {Code}", id, englishName);
                }

                status.Color = request.Color;
                status.DisplayOrder = request.DisplayOrder;
                status.IsFinal = request.IsFinal;

                await _orderRepo.UpdateStatusAsync(status, newTranslations, ct);

                _logger.LogInformation("UpdateStatus completed. TenantId: {TenantId} | StatusId: {StatusId}", tenantId, id);
                return NoContent();
            }
            catch (BadRequestException ex)
            {
                _logger.LogWarning(ex, "UpdateStatus failed - bad request. TenantId: {TenantId}", tenantId);
                return BadRequest(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in UpdateStatus. TenantId: {TenantId} | StatusId: {StatusId}", tenantId, id);
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpDelete("Status/{id:int}")]
                [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Orders, EnPermissionActions.DELETE)]
        public async Task<ActionResult> DeleteStatus(int id, CancellationToken ct)
        {
            var tenantId = User.GetTenantId();
            try
            {
                if (tenantId == null)
                {
                    _logger.LogWarning("DeleteStatus failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                var status = await _orderRepo.GetStatusByIdAsync(id, ct);
                if (status == null || !status.IsActive)
                {
                    _logger.LogWarning("DeleteStatus failed - status not found. StatusId: {StatusId}", id);
                    return NotFound(new { error = "Status not found." });
                }

                if (status.TenantId == null)
                {
                    _logger.LogWarning("DeleteStatus blocked - global status. StatusId: {StatusId} | TenantId: {TenantId}", id, tenantId);
                    return StatusCode(403, new { error = "System statuses cannot be deleted." });
                }

                if (status.TenantId != tenantId)
                {
                    _logger.LogWarning("DeleteStatus failed - tenant mismatch. StatusId: {StatusId} | TenantId: {TenantId}", id, tenantId);
                    return NotFound(new { error = "Status not found." });
                }

                var deleted = await _orderRepo.DeactivateStatusAsync(id, tenantId.Value, ct);
                if (!deleted)
                    return NotFound(new { error = "Status not found." });

                _logger.LogInformation("DeleteStatus completed. TenantId: {TenantId} | StatusId: {StatusId}", tenantId, id);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in DeleteStatus. TenantId: {TenantId} | StatusId: {StatusId}", tenantId, id);
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
        [HttpGet("Status/{id:int}/Translations")]
                [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Orders, EnPermissionActions.READ)]
        public async Task<ActionResult<StatusTranslationsDto>> GetStatusTranslations(int id, CancellationToken ct)
        {
            var tenantId = User.GetTenantId();
            try
            {
                if (tenantId == null)
                {
                    _logger.LogWarning("GetStatusTranslations failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                var status = await _orderRepo.GetStatusByIdAsync(id, ct);
                if (status == null || !status.IsActive
                    || (status.TenantId != null && status.TenantId != tenantId))
                {
                    _logger.LogWarning("GetStatusTranslations failed - not found. StatusId: {StatusId} | TenantId: {TenantId}", id, tenantId);
                    return NotFound(new { error = "Status not found." });
                }

                // Always return every supported language, empty string when missing
                var items = TranslationLanguages.All
                    .Select(lang => new StatusTranslationItem(
                        lang,
                        status.Translations.FirstOrDefault(t => t.Lang == lang)?.Name ?? string.Empty))
                    .ToList();

                _logger.LogInformation("GetStatusTranslations completed. StatusId: {StatusId} | TenantId: {TenantId}", id, tenantId);
                return Ok(new StatusTranslationsDto(status.Id, status.Code, status.TenantId == null, items));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in GetStatusTranslations. StatusId: {StatusId} | TenantId: {TenantId}", id, tenantId);
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
        [HttpPut("Status/{id:int}/Translations")]
                [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Orders, EnPermissionActions.UPDATE)]
        public async Task<ActionResult> UpdateStatusTranslations(
        int id, UpdateStatusTranslationsRequest request, CancellationToken ct)
        {
            var tenantId = User.GetTenantId();
            try
            {
                if (tenantId == null)
                {
                    _logger.LogWarning("UpdateStatusTranslations failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                var status = await _orderRepo.GetStatusByIdAsync(id, ct);
                if (status == null || !status.IsActive)
                    return NotFound(new { error = "Status not found." });

                if (status.TenantId == null)
                {
                    _logger.LogWarning("UpdateStatusTranslations blocked - global status. StatusId: {StatusId}", id);
                    return StatusCode(403, new { error = "System statuses cannot be modified." });
                }

                if (status.TenantId != tenantId)
                    return NotFound(new { error = "Status not found." });

                // Normalize + validate
                var names = new Dictionary<string, string>();
                foreach (var item in request.Translations)
                {
                    var lang = item.Lang?.Trim().ToLowerInvariant() ?? string.Empty;
                    var name = item.Name?.Trim() ?? string.Empty;

                    if (!TranslationLanguages.All.Contains(lang))
                        return BadRequest(new { error = $"Unsupported language '{item.Lang}'." });

                    if (name.Length is < 1 or > 50)
                        return BadRequest(new { error = $"Name for '{lang}' must be 1-50 characters." });

                    if (!names.TryAdd(lang, name))
                        return BadRequest(new { error = $"Duplicate language '{lang}'." });
                }

                // English name is the Code: keep them in sync and check duplicates first
                if (names.TryGetValue("en", out var english)
                    && !string.Equals(english, status.Code, StringComparison.OrdinalIgnoreCase))
                {
                    if (await _orderRepo.StatusCodeExistsAsync(tenantId.Value, english, excludeId: id, ct))
                    {
                        _logger.LogWarning("UpdateStatusTranslations failed - name exists. TenantId: {TenantId} | Name: {Name}", tenantId, english);
                        return BadRequest(new { error = $"A status named '{english}' already exists." });
                    }
                    status.Code = english;
                }

                await _orderRepo.UpdateStatusTranslationsAsync(status, names, ct);

                _logger.LogInformation(
                    "UpdateStatusTranslations completed. TenantId: {TenantId} | StatusId: {StatusId} | Langs: {Count}",
                    tenantId, id, names.Count);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in UpdateStatusTranslations. StatusId: {StatusId} | TenantId: {TenantId}", id, tenantId);
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpGet("current-orders")]
                [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Orders, EnPermissionActions.READ)]
        public async Task<ActionResult<IEnumerable<OrderStatusColumnDto>>> GetCurrentOrders(
       CancellationToken ct)
        {
            var tenantId = User.GetTenantId();
            if (tenantId == null)
            {
                _logger.LogWarning("GetCurrentOrders failed - TenantId claim missing from token");
                return Unauthorized(new { error = "Invalid token." });
            }

            try
            {
                var lan = _languageAccessor.Current;
                var currency = _CurrencyAccessor.Current;

                var result = await _orderRepo.GetOrderStatusColumnDto(
                    tenantId.Value, lan, currency, ct);

                return Ok(result);
            }
            catch (OperationCanceledException)
            {
                return StatusCode(499);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error in GetCurrentOrders. TenantId: {TenantId}", tenantId);
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }


        [HttpPatch("{id:guid}/move-to/{statusId:int}")]
                [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Orders, EnPermissionActions.UPDATE)]
        public async Task<ActionResult> ChangeStatus(Guid id, int statusId, CancellationToken ct)
        {
            var tenantId = User.GetTenantId();
            if (tenantId == null)
            {
                _logger.LogWarning("ChangeStatus failed - TenantId claim missing from token");
                return Unauthorized(new { error = "Invalid token." });
            }

            var userId = User.GetUserId(); // Guid?, from ClaimTypes.NameIdentifier

            try
            {
                var result = await _orderRepo.ChangeStatusAsync(tenantId.Value, id, statusId, userId, ct);

                return result switch
                {
                    ChangeStatusResult.Success => NoContent(),
                    _ => NotFound()
                };
            }
            catch (DbUpdateConcurrencyException)
            {
                return Conflict(new { error = "The order was modified by someone else. Refresh and try again." });
            }
            catch (OperationCanceledException)
            {
                return StatusCode(499);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "Unexpected error in ChangeStatus. OrderId: {OrderId} | StatusId: {StatusId} | TenantId: {TenantId}",
                    id, statusId, tenantId);
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpPost("Pay")]
                [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        public async Task<ActionResult> Pay([FromBody]PayOrder pay, CancellationToken ct)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest("Payment data is required.");


                }
                var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (userIdClaim == null || !Guid.TryParse(userIdClaim, out var userId))
                {
                    _logger.LogWarning("Pay failed - invalid or missing userId in token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("Pay failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                if (pay.AmountToPay <= 0)
                    return BadRequest(new { error = "Amount must be greater than zero." });

                var user = await _userRepo.GetUserByID(userId);
                if (user == null)
                {
                    _logger.LogWarning("Pay failed - user not found. UserId: {UserId}", userId);
                    return NotFound(new { error = "User not found." });
                }

                var tenant = await _tenantRepo.GetByID(tenantId.Value);
                if (tenant == null)
                {
                    _logger.LogWarning("Pay failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                var order = await _orderRepo.GetOrderByIdAsNoTrckingAsync(pay.OrderId, tenantId.Value);
                if (order == null)
                    return NotFound(new { error = "Order not found." });

                if (order.PaymentStatusId != 1)
                    return BadRequest(new { error = "This order is already paid." });

                if (pay.AmountToPay != order.Total)
                    return BadRequest(new { error = "Amount does not match the order total." });

                var paymentMethod = await _paymentMethodsRepo.GetByIdAsync(
                    tenantId.Value, pay.PaymentId, _languageAccessor.Current, ct);
                if (paymentMethod == null)
                    return BadRequest(new { error = "Invalid payment method." });

                await _invoiceRepo.SaveNewInvoice(
                    new InvoiceDTO(pay.OrderId, pay.PaymentId, tenant.Id, pay.AmountToPay,
                                   _CurrencyAccessor.Current, pay.Notes, userId),
                    ct);

                return Created();
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Pay cancelled by client. OrderId: {OrderId}", pay.OrderId);
                return StatusCode(499);
            }
            catch (NotFoundException ex)
            {
                _logger.LogWarning(ex, "Pay failed - not found");
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Pay unexpected error. OrderId: {pay.OrderId} , Ex : {ex.Message}");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpGet("{orderId:guid}/Payment")]
                [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        public async Task<ActionResult<PaymentReceiptDto>> GetPaymentReceipt(Guid orderId, CancellationToken ct)
        {
            try
            {
                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("GetPaymentReceipt failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                // Tenant-scoped lookup: prevents reading another restaurant's receipt
                var order = await _orderRepo.GetOrderByIdAsNoTrckingAsync(orderId, tenantId.Value);
                if (order == null)
                    return NotFound(new { error = "Order not found." });

                // Receipt only exists for paid orders (Id 2 = Paid in your seed data)
                if (order.PaymentStatusId == 1)
                    return BadRequest(new { error = "This order has not been paid yet." });

                var receipt = await _invoiceRepo.GetPaymentReceiptAsync(
                    orderId,
                    _CurrencyAccessor.Current,   // from CurrencyMiddleware
                    _languageAccessor.Current,           // from LanguageMiddleware
                    ct);

                return Ok(receipt);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, "Receipt not found. OrderId: {OrderId}", orderId);
                return NotFound(new { error = "Invoice not found for this order." });
            }
            catch (InvalidOperationException ex)
            {
                // e.g. missing exchange rate
                _logger.LogError(ex, "Receipt conversion failed. OrderId: {OrderId}", orderId);
                return StatusCode(500, new { error = "Could not convert the receipt to the requested currency." });
            }
            catch (OperationCanceledException)
            {
                return StatusCode(499);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetPaymentReceipt unexpected error. OrderId: {OrderId}", orderId);
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpGet("order-history")]
                [Authorize(Roles = $"{nameof(UserRole.TenantOwner)},{nameof(UserRole.TenantStaff)}")]
        [HasPermission(FeatureCodes.Orders, EnPermissionActions.READ)]
        public async Task<ActionResult<PagedResult<AdminOrdersHistoryDTO>>> GetOrderHistoryAsync( [FromQuery] AdminHistoryFilters historyFilters)
        {
            try
            {
                var tenantId = User.GetTenantId();
                if (tenantId == null)
                {
                    _logger.LogWarning("GetOrderHistory failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                var result = await _orderRepo.GetAdminOrdersHistoryAsync(
                    historyFilters,
                    tenantId.Value,
                    _languageAccessor.Current,
                    _CurrencyAccessor.Current);

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "GetOrderHistory unexpected error. TenantId: {TenantId}", User.GetTenantId());
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

    }
}
