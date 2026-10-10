import { useEffect, useMemo } from 'react';
import { navigate, useRoute } from '@/lib/router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSessionOrder } from '@/contexts/SessionOrderContext';
import { formatTime } from '@/utils/dateTime';
import { ArrowLeft, Download, Star } from 'lucide-react';

interface TicketRouteParams {
  orderId?: string;
  orderNumber?: string;
  tableNumber?: string;
  total?: string;
}

function parseParams(search: string): TicketRouteParams {
  const q = new URLSearchParams(search);
  return {
    orderId: q.get('orderId') ?? undefined,
    orderNumber: q.get('orderNumber') ?? undefined,
    tableNumber: q.get('tableNumber') ?? undefined,
    total: q.get('total') ?? undefined,
  };
}

export function OrderTicketPage() {
  const { t, lang, dir } = useLanguage();
  const { route } = useRoute();
  const { tracking, orderId, startNewOrder } = useSessionOrder();

  const params = useMemo(() => parseParams(route.search as unknown as string), [route.search]);
  const effectiveOrderId = params.orderId ?? orderId ?? tracking?.orderId;
  const effectiveOrderNumber = params.orderNumber ?? tracking?.orderNumber?.toString();
  const effectiveTable = params.tableNumber ?? tracking?.tableNumber?.toString();
  const effectiveTotal = params.total ?? (tracking?.total != null ? tracking.total.toFixed(2) : undefined);
  const effectiveCurrency = tracking?.currencyCode ?? null;

  useEffect(() => {
    // If we have no context at all, go back to menu; otherwise stay on ticket.
    if (!effectiveOrderId && !tracking) {
      navigate('/', { replace: true });
    }
  }, [effectiveOrderId, tracking, navigate]);

  const handleDownload = () => {
    // Minimal client-side "download ticket" — print is the simplest portable way.
    // This does not require generating a PDF; most devices can save as PDF from print.
    window.print();
  };

  const handleRate = () => {
    // Placeholder Google Maps search — replace with the tenant's place link if available.
    const query = encodeURIComponent('Snack X');
    window.open(`https://maps.google.com/?q=${query}`, '_blank', 'noopener,noreferrer');
  };

  const handleBackToMenu = () => {
    startNewOrder();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex h-full flex-col bg-gray-50 print:bg-white">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-white/95 px-3 py-3 shadow-sm backdrop-blur print:hidden">
        <button
          type="button"
          onClick={handleBackToMenu}
          aria-label={t('backToMenu')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-700 transition active:bg-gray-100"
        >
          <ArrowLeft className={`h-5 w-5 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h1 className="flex-1 truncate text-center text-base font-extrabold text-gray-900">
          {t('ticketPageTitle')}
        </h1>
        <span className="h-11 w-11" />
      </header>

      <main className="flex flex-1 flex-col items-center justify-between px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-6">
        <section className="w-full max-w-md space-y-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-gray-100 print:shadow-none print:ring-0">
          <div className="space-y-1 text-center">
            <p className="text-sm font-bold uppercase tracking-wide text-gray-400">
              {t('orderDetails')}
            </p>
            {effectiveOrderNumber && (
              <h2 className="text-2xl font-black text-gray-900">
                {t('orderNumber')} {effectiveOrderNumber}
              </h2>
            )}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-semibold text-gray-500">
              {effectiveTable && <span>{t('tableNumber')} {effectiveTable}</span>}
              {tracking?.createdAt && <span>{formatTime(tracking.createdAt, lang)}</span>}
            </div>
          </div>

          {tracking?.items?.length ? (
            <div className="space-y-2">
              {tracking.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">{item.name[lang] || item.name.en}</p>
                    <p className="text-xs font-semibold text-gray-500">x{item.quantity}</p>
                  </div>
                  <span className="text-sm font-extrabold text-gray-900">
                    {(item.lineTotal ?? 0).toFixed(2)} {effectiveCurrency ?? ''}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {effectiveTotal && (
            <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3">
              <span className="text-sm font-extrabold text-gray-900">Total</span>
              <span className="text-lg font-black text-gray-900">
                {effectiveTotal} {effectiveCurrency ?? ''}
              </span>
            </div>
          )}
        </section>

        <div className="w-full max-w-md space-y-2 print:hidden">
          <button
            type="button"
            onClick={handleDownload}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-extrabold text-white shadow-lg transition-transform active:scale-[0.98]"
          >
            <Download className="h-5 w-5" strokeWidth={2.5} />
            {t('downloadTicket')}
          </button>

          <button
            type="button"
            onClick={handleRate}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white text-base font-extrabold text-gray-900 shadow-sm transition-transform active:scale-[0.98]"
          >
            <Star className="h-5 w-5 text-amber-500" strokeWidth={2.5} />
            {t('rateUsOnGoogleMaps')}
          </button>

          <button
            type="button"
            onClick={handleBackToMenu}
            className="mt-1 flex h-12 w-full items-center justify-center rounded-2xl bg-gray-100 text-sm font-extrabold text-gray-700 transition-transform active:scale-[0.98]"
          >
            {t('backToMenu')}
          </button>
        </div>
      </main>
    </div>
  );
}
