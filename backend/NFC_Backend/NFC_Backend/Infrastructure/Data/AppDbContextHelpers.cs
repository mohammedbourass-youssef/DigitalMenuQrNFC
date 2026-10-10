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
            [2] = new[] { "Payée", "مدفوع", "Paid", "Pagado", "Pagato", "支払済み", "已支付", "결제 완료", "Bezahlt" },
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

        public static PaymentMethodTranslation[] BuildPaymentMethodSeed()
        {
            // Same order for every method: fr, ar, en, es, it, ja, zh, ko, de
            string[] langs = { "fr", "ar", "en", "es", "it", "ja", "zh", "ko", "de" };

            var names = new Dictionary<int, string[]>
            {
                // 1 = CASH
                [1] = new[] { "Espèces", "نقدًا", "Cash", "Efectivo", "Contanti", "現金", "现金", "현금", "Bargeld" },

                // 2 = CARD
                [2] = new[] { "Carte bancaire", "بطاقة بنكية", "Card", "Tarjeta", "Carta", "カード", "银行卡", "카드", "Karte" },

                // 3 = BANK_TRANSFER
                [3] = new[] { "Virement bancaire", "تحويل بنكي", "Bank transfer", "Transferencia bancaria", "Bonifico bancario", "銀行振込", "银行转账", "계좌이체", "Banküberweisung" },

                // 4 = MOBILE
                [4] = new[] { "Paiement mobile", "الدفع عبر الهاتف", "Mobile payment", "Pago móvil", "Pagamento mobile", "モバイル決済", "移动支付", "모바일 결제", "Mobile Zahlung" },
            };

            var result = new List<PaymentMethodTranslation>();

            foreach (var (methodId, values) in names)
            {
                for (int i = 0; i < langs.Length; i++)
                {
                    result.Add(new PaymentMethodTranslation
                    {
                        // Deterministic IDs: method 1 → 1..9, method 2 → 10..18, etc.
                        Id = (methodId - 1) * langs.Length + i + 1,
                        PaymentMethodId = methodId,
                        Lang = langs[i],
                        Name = values[i]
                    });
                }
            }

            return result.ToArray();
        }

    }
}