using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Caching.Memory;
using NFC_Backend.Domain.DTOS;
using NFC_Backend.Domain.Entities;
using NFC_Backend.Exceptions;
using NFC_Backend.Extensions;
using NFC_Backend.MidlleWares;
using NFC_Backend.Repos.Implementations;
using NFC_Backend.Repos.Interfaces;
using NFC_Backend.Services;
using System;
using System.Drawing;

namespace NFC_Backend.Controllers
{
    [Route("api/tenant")]
    [ApiController]
    public class TenantController(
    ITenantAccessor tenantAccessor,
    ITenantRepo tenantRepo,
    ITokenService tokenService,
    ISessionsRepository sessionRepo,
    IFileStorageService filestorage,
    ICategoryRepo category,
    IMemoryCache cache,
    IMenuItemRepo menuItem,
    IConfiguration configuration,
    ITableRepo tablerep,
    ISessionAccessor Sessionaccessor,
    IExchangeRateRepo exchangeRateRepo,
    IOrderRepo orderRepo,
    IMenuItemRepo menuItemRepo,
    ILanguageAccessor languageAccessor,
    INotifcationService notifcationService,
    IOrderLiveChangesService orderLiveChangesService,
    ICurrencyAccessor currencyAccessor,
    ILogger<TenantController> logger) : ControllerBase
    {
        [HttpGet("info")]
        [AllowAnonymous]
        public async Task<ActionResult<TenantInfoResponse>> GetInfo(
     [FromQuery] string? oldSession,
     CancellationToken ct)
        {
            if (tenantAccessor.Current is null)
                return NotFound(new { error = "Restaurant not found" });

            var tenant = await tenantRepo.GetTenantInfosByID(tenantAccessor.Current.Id);
            if (tenant is null)
                return NotFound(new { error = "Restaurant not found" });

            // Builds the response once, so both paths return the same shape
            async Task<TenantInfoResponse> BuildResponseAsync(string sessionId) => new()
            {
                SessionId = sessionId,
                RestaurantName = tenant.RestaurantName,
                LogoUrl = await filestorage.GetFileUrlAsync(tenant.LogoUrl, tenant.BucketName),
                PrimaryColor = tenant.PrimaryColor,
                DefaultCurrency = tenant.Currency.Symbol,
                PhoneNumber = tenant.PhoneNumber,
                Address = tenant.Address
            };

            // 1) Reuse the existing session if the client sent one and it is still valid
            if (!string.IsNullOrWhiteSpace(oldSession))
            {
                var oldHash = tokenService.HashSessionToken(oldSession);
                var existing = await sessionRepo.GetByTokenHashAsync(oldHash);

                // The tenant check prevents a token issued for restaurant A
                // from being accepted on restaurant B's subdomain/URL.
                if (existing is not null && existing.IsValid && existing.TenantId == tenant.Id)
                {
                    // Re-warm the cache in case it expired or the app restarted
                    var existingInfo = new SessionInfo(
                        existing.Id, tenant.Id, existing.TableId ?? Guid.Empty, existing.ExpiresAt);

                    var remaining = existing.ExpiresAt - DateTime.UtcNow;
                    if (remaining > TimeSpan.Zero)
                        cache.Set($"session:{oldHash}", existingInfo, remaining);

                    return Ok(await BuildResponseAsync(oldSession));
                }
            }

            // 2) No session, invalid, expired, or from another tenant: issue a new one
            var plainToken = tokenService.GenerateSessionToken();
            var tokenHash = tokenService.HashSessionToken(plainToken);
            
            // Key must match docker-compose `Variable__SessionExpirationHours`
            // (= SESSION_EXPIRATION_HOURS). Fall back to 24h if unset/invalid
            // rather than throwing on a missing value.
            var expiresInHours = int.TryParse(configuration["Variable:SessionExpirationHours"], out var hours) && hours > 0
                ? hours
                : 24;
            var expiresIn = TimeSpan.FromHours(expiresInHours);
            var session = await sessionRepo.CreateAsync(tokenHash, tenant.Id, expiresIn);
            await sessionRepo.SaveChangesAsync();

            // Key MUST match SessionMiddleware's cache key: session:{tokenHash}
            var sessionInfo = new SessionInfo(
                session.Id, tenant.Id, session.TableId ?? Guid.Empty, session.ExpiresAt);
            cache.Set($"session:{tokenHash}", sessionInfo, expiresIn);

            return Ok(await BuildResponseAsync(plainToken));
        }
        [HttpGet("Categories")]
        [AllowAnonymous]
        [NeedSession]
        public async Task<ActionResult> GetSimpleInfos([FromQuery] string lang)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                logger.LogInformation("GetSimpleInfos started");

                var tenantId = tenantAccessor.Current.Id;
                if (tenantId == null)
                {
                    logger.LogWarning("GetSimpleInfos failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await tenantRepo.GetByID(tenantId);
                if (tenant == null)
                {
                    logger.LogWarning("GetSimpleInfos failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                var data = await category.GetPublicCategories(tenant.Id, lang);
                foreach (var category in data)
                {
                    category.Image = await filestorage.GetFileUrlAsync(category.Image, tenant.BucketName);
                }
                if (data.Count == 0)
                {
                    return NoContent();
                }
                return Ok(new { data });
            }
            catch (NotFoundException ex)
            {
                logger.LogWarning(ex.Message);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "GetSimpleInfos unexpected error");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpGet("menu")]
        [AllowAnonymous]
        [NeedSession]
        public async Task<ActionResult> GetMenuInfos([FromQuery] MenuRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                logger.LogInformation("GetMenuInfos started");

                var tenantId = tenantAccessor.Current.Id;
                if (tenantId == null)
                {
                    logger.LogWarning("GetMenuInfos failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await tenantRepo.GetByID(tenantId);
                if (tenant == null)
                {
                    logger.LogWarning("GetMenuInfos failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                if (!request.getAll)
                {
                    Category? c = await category.GetCategoryByIDAsync(request.CategoryId.Value, tenantId);
                    if (c == null)
                    {
                        return BadRequest(new { error = "Category not found." });
                    }
                }

                var data = await menuItem.GetPublicMenuItemsAsync(
                    tenant.Id,
                   
                    request.getAll ? null : request.CategoryId, request.lang);

                if (data.Count == 0)
                    return NoContent();   // empty page, same shape as any other page
                var rateList = await exchangeRateRepo.GetPrices(request.currency);
                var rates = rateList.ToDictionary(e => e.BaseCurrency, e => e.Rate);
                rates[request.currency] = 1m;

                var missing = data
                    .Select(m => m.CurrencyCode)
                    .Distinct()
                    .Where(c => !rates.ContainsKey(c))
                    .ToList();

                if (missing.Count > 0)
                    throw new NotFoundException(
                        $"Exchange rate not found for: {string.Join(", ", missing)} → {request.currency}");

                foreach (var item in data)
                {
                    var rate = rates[item.CurrencyCode];
                    if (!string.IsNullOrEmpty(item.CoverImage))
                        item.CoverImage = await filestorage.GetFileUrlAsync(item.CoverImage, tenant.BucketName);

                    for (int i = 0; i < item.Images.Count; i++)
                        item.Images[i] = await filestorage.GetFileUrlAsync(item.Images[i], tenant.BucketName);
                    item.CurrencyCode = request.currency;
                    item.Price *= rate;
                    item.OriginalPrice *= rate;
                }

                if (data.Count == 0)
                {
                    return NoContent();
                }
                return Ok(new { data });
            }
            catch (NotFoundException ex)
            {
                logger.LogWarning(ex.Message);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "GetMenuInfos unexpected error");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpGet("Tables")]
        [AllowAnonymous]
        [NeedSession]
        public async Task<ActionResult> GetTables()
        {
            try
            {
                logger.LogInformation("GetTables started");

                var tenantId = tenantAccessor.Current.Id;
                if (tenantId == null)
                {
                    logger.LogWarning("GetTables failed - TenantId claim missing from token");
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await tenantRepo.GetByID(tenantId);
                if (tenant == null)
                {
                    logger.LogWarning("GetTables failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                var tables = await tablerep.GetAllByTenantAsync(tenant.Id);

                var data = tables.Select(t => new TableResponseDTO
                {
                    Id = t.Id,
                    Number = t.Number,
                    Name = t.Name,
                    IsAvailable = t.IsAvailable
                }).ToList();

                if (data.Count == 0)
                {
                    return NoContent();
                }
                return Ok(new { data });
            }
            catch (NotFoundException ex)
            {
                logger.LogWarning(ex.Message);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "GetTables unexpected error");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
        [HttpPost("Order")]
        [AllowAnonymous]
        [NeedSession]
        public async Task<ActionResult> CreateOrderFromMenu(OrderRequestDTO requestDTO , CancellationToken ct)
        {
            try
            {
                logger.LogInformation("CreateOrderFromMenu started");

                // 1. Basic request validation
                if (requestDTO.orderItems == null || !requestDTO.orderItems.Any())
                    return BadRequest(new { error = "The order must contain at least one item." });

                if (requestDTO.orderItems.Any(i => i.Quantity <= 0))
                    return BadRequest(new { error = "Invalid item quantity." });

                // 2. Tenant
                var tenantId = tenantAccessor.Current.Id;
                if (tenantId == null)
                {
                    logger.LogWarning("CreateOrderFromMenu failed - tenant missing from context");
                    return Unauthorized(new { error = "Invalid token." });
                }

                Tenant? tenant = await tenantRepo.GetByID(tenantId);
                if (tenant == null)
                {
                    logger.LogWarning("CreateOrderFromMenu failed - tenant not found. TenantId: {TenantId}", tenantId);
                    return NotFound(new { error = "Restaurant not found." });
                }

                // 3. Table
                Table? table = await tablerep.GetByTableNumberAsync(requestDTO.TableNumber, tenantId);
                if (table == null)
                {
                    logger.LogWarning("Table {TableNumber} not found. TenantId: {TenantId}",
                        requestDTO.TableNumber, tenantId);
                    return NotFound(new { error = "Table not found." });
                }

                // 4. Load ALL menu items in ONE query (no loop of queries, no parallel DbContext use)
                var requestedIds = requestDTO.orderItems.Select(i => i.Id).Distinct().ToList();
                var menuItems = (await menuItemRepo.GetMenuItemsByIdsAsync(requestedIds, tenantId))
                                .ToDictionary(m => m.Id);

                var missing = requestedIds.Where(id => !menuItems.ContainsKey(id)).ToList();
                if (missing.Count > 0)
                {
                    logger.LogWarning("Menu items not found: {Ids}. TenantId: {TenantId}", missing, tenantId);
                    return NotFound(new { error = "One or more items are no longer available." });
                }
                var rateList = await exchangeRateRepo.GetPrices(requestDTO.DefaultCurrency);
                var rates = rateList.ToDictionary(e => e.BaseCurrency, e => e.Rate);
                rates[requestDTO.DefaultCurrency] = 1m;

                // 5. Build order items using SERVER-side prices
                var orderItems = requestDTO.orderItems.Select(c =>
                {
                    var menu = menuItems[c.Id];
                    if (!rates.TryGetValue(menu.DefaultCurrencyCode, out var rate))
                        throw new InvalidOperationException($"Missing exchange rate for {menu.DefaultCurrencyCode}");

                    var unitPrice = Math.Round(Convert.ToDecimal(menu.DiscountedPrice) * rate, 2);
                    return new OrderItem
                    {
                        MenuItemId = menu.Id,
                        NameSnapshot = "",
                        UnitPrice = unitPrice,
                        Quantity = c.Quantity,
                        LineTotal = unitPrice * c.Quantity
                    };
                }).ToList();
                // 6. Build the order with its items attached (saved together in one transaction)
                var OrderNumber = await orderRepo.GetNextOrderNumberAsync(tenantId);
                var currentTime = DateTime.UtcNow;
                var order = new Order
                {
                    CreatedAt = currentTime,
                    CurrencyCode = requestDTO.DefaultCurrency,  
                    Notes = requestDTO.Notes,
                    TableId = table.Id,
                    OrderNumber = OrderNumber,                         // see note below
                    PaidAmount = 0,
                    PaidAt = null,
                    PaymentStatusId = 1,
                    StatusId =1,
                    SessionId = Sessionaccessor.Current.Id,
                    TenantId = tenantId,
                    Items = orderItems,
                    Total = orderItems.Sum(i => i.LineTotal)
                };
                var orderId = await orderRepo.CreateNewOrderFromMenuAsync(order);
                var status = await orderRepo.GetStatusByIdAsync(1);
                OrderTrackingDto trackingDto = new OrderTrackingDto
                {
                    CanAddItems = true,
                    CurrentStatus = new OrderStatusStepDto
                    {
                        ChangedAtUtc = currentTime,
                        State = OrderStepState.Current,
                        StatusColor = status.Color,
                        StatusId = status.Id,
                        StatusName = status.Translations.FirstOrDefault(c => c.Lang == requestDTO.lang)?.Name ?? status.Translations.FirstOrDefault()?.Name,
                    },
                    IsFinal = false,
                    OrderId = orderId,
                    OrderNumber = OrderNumber ,
                    Steps  = new List<OrderStatusStepDto>(),
                    TableNumber = requestDTO.TableNumber,
                };
                var summary = new OrderSummaryStatusDto
                {
                    OrderId = order.Id,
                    OrderNumber = order.OrderNumber,
                    TableNumber = table.Number,
                    TotalPrice = order.Total,
                    Lines = await orderRepo.GetTrackingInfo(order.Id, languageAccessor.Current, currencyAccessor.Current, ct),
                };
                notifcationService.SendNotificationOnOrderCreated(1 , tenantId);
                orderLiveChangesService.SendNewOrderAsync(summary, tenantId,ct);
                logger.LogInformation("Order {OrderId} created. TenantId: {TenantId}", orderId, tenantId);
                return Ok(trackingDto);
            }
            catch (NotFoundException ex)
            {
                logger.LogWarning(ex.Message);
                return NotFound(new { error = ex.Message });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "CreateOrderFromMenu unexpected error");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }

        [HttpGet("Order/{id:guid}/Line")]
        [AllowAnonymous]
        [NeedSession]
        public async Task<ActionResult<OrderTrackingDto>> GetOrderLine(Guid id, CancellationToken ct)
        {
            try
            {
                var tenantId = tenantAccessor.Current.Id;
                var session = Sessionaccessor.Current;

                // Tenant AND session scoped: a session can only read its own order
                Order? order = await orderRepo.GetOrderByIdAsNoTrckingIncludeTableAsync(
                    id, tenantId, session.Id);

                if (order is null)
                {
                    logger.LogWarning("GetOrderLine: order {OrderId} not found for session {SessionId}", id, session.Id);
                    return NotFound(new { code = "ORDER_NOT_FOUND", error = "Order not found." });
                }

                var lang = languageAccessor.Current;

                var currentStatus = await orderRepo.GetOrderCurrentStatusByOrderIdAsync(order.Id,order.StatusId ,lang);
                var statusInfo = await orderRepo.GetStatusByIdAsync(order.StatusId);
                if (currentStatus is null || statusInfo is null)
                {
                    logger.LogError("GetOrderLine: status data missing for order {OrderId}", order.Id);
                    return StatusCode(500, new { error = "Order status is unavailable." });
                }

                var steps = await orderRepo.GetOrderHistoryAsync(order.Id, order.StatusId, lang);

                var dto = new OrderTrackingDto
                {
                    OrderId = order.Id,
                    OrderNumber = order.OrderNumber,
                    TableNumber = order.Table.Number,
                    CurrentStatus = currentStatus,
                    Steps = steps,
                    IsFinal = statusInfo.IsFinal,
                    CanAddItems = !statusInfo.IsFinal         
                };

                Response.Headers.CacheControl = "no-store";
                return Ok(dto);
            }
            catch (NotFoundException ex)
            {
                logger.LogWarning(ex, "GetOrderLine not found");
                return NotFound(new { code = "ORDER_NOT_FOUND", error = ex.Message });
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "GetOrderLine unexpected error");
                return StatusCode(500, new { error = "An unexpected error occurred." });
            }
        }
    }

}
