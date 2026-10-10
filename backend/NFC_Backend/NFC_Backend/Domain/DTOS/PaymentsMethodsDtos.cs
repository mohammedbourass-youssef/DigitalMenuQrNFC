using System.ComponentModel.DataAnnotations;

namespace NFC_Backend.Domain.DTOS
{

    // ── Responses ───────────────────────────────────────────

    /// <summary>System method shown in the "Add" dropdown.</summary>
    public record SystemPaymentMethodDto(
        int Id,
        string Code,
        string Name,
        string? Description,
        string? Color,
        string? Icon,
        bool AlreadyAdded);          // true => disable this option in the dropdown

    /// <summary>One row of the tenant table.</summary>
    public record TenantPaymentMethodDto(
        int Id,                      // TenantPaymentMethod.Id (use this for all actions)
        int PaymentMethodId,         // system method id
        string Code,
        string SystemName,           // translated system name
        string? DisplayName,         // custom label (nullable)
        string Label,                // DisplayName ?? SystemName  (what customers/cashiers see)
        string? Color,
        string? Icon,
        bool IsEnabled,
        bool IsDefault,
        int DisplayOrder);

    // ── Requests ────────────────────────────────────────────

    public class AddTenantPaymentMethodRequest
    {
        [Required]
        public int PaymentMethodId { get; set; }

        [StringLength(100)]
        public string? DisplayName { get; set; }

        public bool IsEnabled { get; set; } = true;
        public bool IsDefault { get; set; }
    }

    public class UpdateTenantPaymentMethodRequest
    {
        [StringLength(100)]
        public string? DisplayName { get; set; }     // empty/null => fall back to system name

        public bool IsEnabled { get; set; } = true;
    }

    public class SetEnabledRequest
    {
        public bool IsEnabled { get; set; }
    }

    public class ReorderPaymentMethodsRequest
    {
        [Required, MinLength(1)]
        public List<int> OrderedIds { get; set; } = new();   // TenantPaymentMethod ids, in the new order
    }
}
