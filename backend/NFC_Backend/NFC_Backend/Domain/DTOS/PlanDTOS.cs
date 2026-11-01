using NFC_Backend.Domain.Entities;
using System.ComponentModel.DataAnnotations;

namespace NFC_Backend.Domain.DTOS
{
    public class TenantPlanInformations
    {
        public Guid TenantId {  get; set; }
        public string TenantName { get; set; }

        public string PlanName { get; set; } = string.Empty;
        public string? Description { get; set; }
        public bool IsFree { get; set; }
        public BillingCycle BillingCycle { get; set; } = BillingCycle.Monthly;
        public string UsedUsersFromTotal { get; set; }
        public string UsedCategoriesFromTotal { get; set; }
        public string UsedMenuItemsFromTotal { get; set; }
        public string UsedTablesFromTotal { get; set; }

        public string UsedRolesFromTotal { get; set; }
        public int MaxImagesPerMenu { get; set; }
        public string UsedLanguagesTotal { get; set; }
        public DateTime? StartAtUTC { get; set; }
        public DateTime? ExpiresATutc { get; set; }
    }
    public class AllPlansRequest
    {
        [EnumDataType(typeof(BillingCycle))]
        public BillingCycle PaymentType { get; set; } = BillingCycle.Yearly;
    }
    public class PlanPricingDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public int MaxUsers { get; set; }
        public int MaxCategories { get; set; }
        public int MaxMenuItems { get; set; }
        public int MaxTables { get; set; }
        public int MaxImagesPerMenuItem { get; set; }
        public int MaxLanguages { get; set; }
        public int MaxRoles { get; set; }
        public bool IsCurrent { get; set; }
        // Pricing
        public bool IsFree { get; set; }
        public decimal Price { get; set; }
        public int? YearlySavingsPercent { get; set; }
        public int DisplayOrder { get; set; }
        public List<PlanFeatureDto> Features { get; set; } = new();
        public bool CanUpgrade { get; set; }
    }

    public class PlanFeatureDto
    {
        /// <summary>Stable key for i18n, e.g. "users", "categories", "menuItems", "tables", "imagesPerMenuItem", "languages".</summary>
        public string Key { get; set; } = string.Empty;

        /// <summary>The limit. Null when unlimited.</summary>
        public int? Value { get; set; }
        public bool IsUnlimited { get; set; }
    }


    public class QuotaItemDto
    {
        public int Used { get; set; }
        public int? Max { get; set; }          // null = unlimited
        public bool CanAdd => Max is null || Used < Max;
        public string Display => Max is null ? $"{Used} / Unlimited" : $"{Used} / {Max}";
    }

    public class PlanQuotaDTo
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public QuotaItemDto Categories { get; set; } = new();
        public QuotaItemDto MenuItems { get; set; } = new();
        public QuotaItemDto Tables { get; set; } = new();
        public QuotaItemDto Users { get; set; } = new();
        public QuotaItemDto Roles { get; set; } = new();
        public int MaxImagesPerMenuItem { get; set; }
    }

}
