import { useEffect, useMemo } from 'react';
import { navigate } from '@/lib/router';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSessionOrder } from '@/contexts/SessionOrderContext';
import { useTenant } from '@/contexts/TenantContext';
import { formatTime } from '@/utils/dateTime';
import { ArrowLeft, CheckCircle2, Download, Star } from 'lucide-react';

interface TicketRouteParams {
  orderId?: string;
  orderNumber?: string;
  tableNumber?: string;
  total?: string;
  currency?: string;
  createdAt?: string;
}

function parseParams(search: string): TicketRouteParams {
  const q = new URLSearchParams(search);
  return {
    orderId: q.get('orderId') ?? undefined,
    orderNumber: q.get('orderNumber') ?? undefined,
    tableNumber: q.get('tableNumber') ?? undefined,
    total: q.get('total') ?? undefined,
    currency: q.get('currency') ?? undefined,
    createdAt: q.get('createdAt') ?? undefined,
  };
}

/**
 * Order ticket screen (`/ticket`).
 *
 * Opened by the tracking screen's "Finish & Get My Ticket" action, which wipes
 * the session (order, cart and session token) before navigating here — so this
 * screen reads the receipt from its own query string rather than from the
 * session, which no longer has an order. It is intentionally reachable even
 * with no active order.
 */
export function OrderTicketPage() {
  const { t, lang, dir } = useLanguage();
  const { tracking, orderId, startNewOrder } = useSessionOrder();
  const { tenant } = useTenant();

  // Read once: the finish action builds these params, and nothing updates the
  // query string while this screen is mounted.
  const params = useMemo(() => parseParams(window.location.search), []);
  const effectiveOrderId = params.orderId ?? orderId ?? tracking?.orderId;
  const effectiveOrderNumber = params.orderNumber ?? tracking?.orderNumber?.toString();
  const effectiveTable = params.tableNumber ?? tracking?.tableNumber?.toString();
  const effectiveTotal = params.total ?? (tracking?.total != null ? tracking.total.toFixed(2) : undefined);
  const effectiveCurrency = params.currency ?? tracking?.currencyCode ?? null;
  const effectiveCreatedAt = params.createdAt ?? tracking?.createdAt ?? null;

  useEffect(() => {
    // If we have no context at all (a bare deep link), go back to menu.
    if (!effectiveOrderId && !tracking) {
      navigate('/', { replace: true });
    }
  }, [effectiveOrderId, tracking]);

  const handleDownload = () => {
    // Minimal client-side "download ticket" — print is the simplest portable way.
    // This does not require generating a PDF; most devices can save as PDF from print.
    window.print();
  };

  const handleRate = () => {
    // Search for the restaurant by name; the tenant name is the only public
    // identifier the menu app has (no place id is exposed by the backend).
    const name = tenant?.restaurantName || tenant?.name || '';
    const base = 'https://maps.google.com/';
    const url = name ? `${base}?q=${encodeURIComponent(name)}` : base;
    window.open(url, '_blank', 'noopener,noreferrer');
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

      <main className="flex flex-1 flex-col items-center justify-between gap-4 overflow-y-auto px-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] pt-6">
        <section className="w-full max-w-md space-y-5 rounded-3xl bg-white p-5 shadow-soft ring-1 ring-gray-100 print:shadow-none print:ring-0">
          <div className="space-y-2 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" strokeWidth={2.5} />
            <h2 className="text-xl font-black text-gray-900">{t('thankYou')}</h2>
            <p className="text-sm font-bold uppercase tracking-wide text-gray-400">
              {t('orderDetails')}
            </p>
            {effectiveOrderNumber && (
              <p className="text-lg font-extrabold text-gray-900">
                {t('orderNumber')} {effectiveOrderNumber}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs font-semibold text-gray-500">
              {effectiveTable && <span>{t('tableNumber')} {effectiveTable}</span>}
              {effectiveCreatedAt && <span>{formatTime(effectiveCreatedAt, lang)}</span>}
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
          {/* Rating prompt — the five stars mirror what the customer is asked
              for; tapping either the stars or the button opens Google Maps. */}
          <div className="rounded-2xl bg-white p-4 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-sm font-extrabold text-gray-900">{t('rateUsFiveStars')}</p>
            <div className="mt-2 flex items-center justify-center gap-1.5" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-6 w-6 fill-amber-400 text-amber-400" strokeWidth={1.5} />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleRate}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-brand text-base font-extrabold text-white shadow-lg transition-transform active:scale-[0.98]"
          >
            <Star className="h-5 w-5" strokeWidth={2.5} />
            {t('rateUsOnGoogleMaps')}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white text-base font-extrabold text-gray-900 shadow-sm transition-transform active:scale-[0.98]"
          >
            <Download className="h-5 w-5" strokeWidth={2.5} />
            {t('downloadTicket')}
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
