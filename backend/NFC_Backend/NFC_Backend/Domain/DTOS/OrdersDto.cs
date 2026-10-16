using Microsoft.EntityFrameworkCore.Query.Internal;
using System.ComponentModel;
using System.ComponentModel.DataAnnotations;
using System.Runtime.InteropServices;
using System.Text.Json.Serialization;

namespace NFC_Backend.Domain.DTOS
{
    public class CreateNewStatusRequest
    {
        [Required]
        public string Code { get; set; } = null!;
        [Required]
        public string? Color { get; set; }
        [Required]
        public int DisplayOrder { get; set; }
    }
    public sealed record OrderStatusDto(
       int Id,
       string Code,
       string Name,
       string? Color,
       int DisplayOrder,
       bool IsFinal , bool IsSystem);

    public sealed class UpdateStatusRequest
    {
        [Required, StringLength(50, MinimumLength = 1)]
        public string Name { get; set; } = null!;

        [Required, RegularExpression("^#[0-9A-Fa-f]{6}$")]
        public string Color { get; set; } = null!;

        [Range(1, int.MaxValue)]
        public int DisplayOrder { get; set; }

        public bool IsFinal { get; set; }
    }
    public sealed record StatusTranslationItem(string Lang, string Name);

    public sealed record StatusTranslationsDto(
        int StatusId,
        string Code,
        bool IsSystem,
        List<StatusTranslationItem> Translations);

    public sealed class UpdateStatusTranslationsRequest
    {
        [Required, MinLength(1)]
        public List<StatusTranslationItem> Translations { get; set; } = new();
    }


    public sealed class OrderItemDto
    {
        [Required]
        public Guid Id { get; set; }
        [Required]
        public int Quantity { get; set; }
        [Required]
        public decimal UnitPrice { get; set; }
        [Required]
        public decimal TotalPrice { get; set; }

    }

    public sealed class OrderRequestDTO
    {
        [Required]
        public string lang {  get; set; }
        [Required]
        public decimal TotalPrice { get; set; }
        [Required]
        public string DefaultCurrency { get; set; }
        [Required]
        public int TableNumber { get; set; }

        public string? Notes { get; set; }


        [Required]
        public IEnumerable<OrderItemDto> orderItems { get; set; }
    }

    public enum OrderStepState { Completed, Current, Upcoming }

    public sealed class OrderStatusStepDto
    {
        public int StatusId { get; set; }                 // stable key for icons
        public string StatusName { get; set; } = string.Empty;   // translated
        public string StatusColor { get; set; } = "#9CA3AF";     // hex, e.g. #F59E0B
        public OrderStepState State { get; set; }
        public DateTimeOffset? ChangedAtUtc { get; set; } // null for Upcoming
    }

    public sealed class OrderTrackingDto
    {
        public Guid OrderId { get; set; }
        public int OrderNumber { get; set; }
        public int TableNumber { get; set; }
        public OrderStatusStepDto CurrentStatus { get; set; } = default!;
        public List<OrderStatusStepDto> Steps { get; set; } = [];  // ordered: completed, current, upcoming
        public bool IsFinal { get; set; }                 // finished or cancelled
        public bool CanAddItems { get; set; }
    }

    public sealed class OrderLineItemDto
    {
        [Required]
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        [Required]
        public int Quantity { get; set; }
        [Required]
        public decimal UnitPrice { get; set; }
        [Required]
        public decimal TotalPrice { get; set; }
    }

    public sealed class OrderSummaryStatusDto
    {
        public Guid OrderId { get; set; }
        public int OrderNumber { get; set; }
        public int TableNumber { get; set; }
        public decimal TotalPrice { get; set; }

        /// <summary>
        /// True only when the order's PaymentStatus code is "paid".
        /// Partial and refunded orders are NOT considered paid.
        /// </summary>
        public bool IsPaid { get; set; } = false;
        public IEnumerable<OrderLineItemDto> Lines { get; set; } = [];
    }

    public sealed class OrderStatusColumnDto
    {
        public int StatusId { get; set; }
        public string StatusName { get; set; } = string.Empty;
        public string StatusColor { get; set; } = "#9CA3AF";
        public int TotalOrders { get; set; }
        public bool IsSystem { get; set; }

        public IEnumerable<OrderSummaryStatusDto> Orders { get; set; } = [];
    }

    public sealed class PayOrder
    {
        [Required]
        public Guid OrderId { get; set; }
        [Required]
        public int PaymentId { get; set; }
        [Required]
        public decimal AmountToPay { get; set; }
        public string? Notes { get; set; }
    }


    
    public sealed class AdminOrdersHistoryDTO
    {
        public Guid orderId { get; set; }
        public Guid? TableId { get; set; }
        public int OrderNumber { get; set; }
        public string OrderStatus { get ; set; } = string.Empty;
        public string PaymentStatus { get ; set; } = string.Empty;
        public decimal Subtotal { get; set; }
        public decimal Total { get; set; }
        public decimal PaidAmount { get; set; }        // drives Unpaid / Partial / Paid
        public DateTime? PaidAtUTC { get; set; }          // set when fully paid
        public string? Notes { get; set; }
        public DateTime CreatedAtURC { get; set; }
        public int TotalItems { get; set; }
    }

    public record AdminHistoryFilters(int? OrderNumber , DateTime? FromUTC , DateTime? ToUTC , int PageCunt , int PageNumber , int? OrderStatus , int? paymentStatus );

}
