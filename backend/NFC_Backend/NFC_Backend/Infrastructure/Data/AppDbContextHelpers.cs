using NFC_Backend.Domain.Entities;

namespace NFC_Backend.Infrastructure.Data
{
    internal static class AppDbContextHelpers
    {

        public static readonly string[] SeedLangs =
            { "fr", "ar", "en", "es", "it", "ja", "zh", "ko", "de" };

        // Key = OrderStatus.Id
        public static readonly Dictionary<int, string[]> OrderStatusNames = new()
        {
            // 1 = New
            [1] = new[] { "Nouvelle", "جديد", "New", "Nueva", "Nuovo", "新規", "新订单", "신규", "Neu" },
            // 2 = Preparing
            [2] = new[] { "En préparation", "قيد التحضير", "Preparing", "En preparación", "In preparazione", "準備中", "准备中", "준비 중", "In Zubereitung" },
            // 3 = Completed
            [3] = new[] { "Terminée", "مكتمل", "Completed", "Completada", "Completato", "完了", "已完成", "완료", "Abgeschlossen" },
            // 4 = Cancelled
            [4] = new[] { "Annulée", "ملغي", "Cancelled", "Cancelada", "Annullato", "キャンセル", "已取消", "취소됨", "Storniert" },
        };

        // Key = PaymentStatus.Id
        public static readonly Dictionary<int, string[]> PaymentStatusNames = new()
        {
            // 1 = Unpaid
            [1] = new[] { "Non payée", "غير مدفوع", "Unpaid", "Sin pagar", "Non pagato", "未払い", "未支付", "미결제", "Unbezahlt" },
            // 2 = Partial
            [2] = new[] { "Partiellement payée", "مدفوع جزئياً", "Partially paid", "Pago parcial", "Pagato parzialmente", "一部支払済み", "部分支付", "부분 결제", "Teilweise bezahlt" },
            // 3 = Paid
            [3] = new[] { "Payée", "مدفوع", "Paid", "Pagado", "Pagato", "支払済み", "已支付", "결제 완료", "Bezahlt" },
            // 4 = Refunded
            [4] = new[] { "Remboursée", "مسترجع", "Refunded", "Reembolsado", "Rimborsato", "返金済み", "已退款", "환불됨", "Erstattet" },
        };

        // Ids are deterministic (statusId * 100 + langIndex), so adding a
        // language later never shifts existing seed row ids.
        public static List<OrderStatusTranslation> BuildOrderStatusSeed()
        {
            var list = new List<OrderStatusTranslation>();
            foreach (var (statusId, names) in OrderStatusNames.OrderBy(k => k.Key))
            {
                for (var i = 0; i < SeedLangs.Length; i++)
                {
                    list.Add(new OrderStatusTranslation
                    {
                        Id = statusId * 100 + i,
                        OrderStatusId = statusId,
                        Lang = SeedLangs[i],
                        Name = names[i]
                    });
                }
            }
            return list;
        }

        public static List<PaymentStatusTranslation> BuildPaymentStatusSeed()
        {
            var list = new List<PaymentStatusTranslation>();
            foreach (var (statusId, names) in PaymentStatusNames.OrderBy(k => k.Key))
            {
                for (var i = 0; i < SeedLangs.Length; i++)
                {
                    list.Add(new PaymentStatusTranslation
                    {
                        Id = statusId * 100 + i,
                        PaymentStatusId = statusId,
                        Lang = SeedLangs[i],
                        Name = names[i]
                    });
                }
            }
            return list;
        }
    }
}