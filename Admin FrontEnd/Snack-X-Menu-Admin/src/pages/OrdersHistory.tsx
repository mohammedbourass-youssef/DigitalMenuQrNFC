import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import type { TFunction } from 'i18next';

import { Button } from '@/components/ui/button';
import { useOrderHistory } from '@/hooks/useOrderHistory';
import { PAYMENT_STATUS_LOOKUP } from '@/lib/orderHistoryConstants';
import { getCurrency } from '@/lib/preferences';
import type { AdminHistoryFilters, AdminOrdersHistoryDTO } from '@/types/orderHistory';
import { useOrderStatuses } from '@/hooks/useOrderStatuses';

const PAGE_SIZES = [20, 50, 100];
type Facet = { key: string; label: string; value: string };

function localDateToUtc(value: string, endOfDay = false): string | undefined {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ error?: string; message?: string }>(error)) {
    return error.response?.data?.error ?? error.response?.data?.message ?? error.message;
  }
  return error instanceof Error ? error.message : 'Unable to load order history';
}

function StatusBadge({ value, kind }: { value: string; kind: 'order' | 'payment' }) {
  const normalized = value.toLowerCase();
  const color = kind === 'order'
    ? normalized.includes('cancel') ? 'bg-red-100 text-red-700' : normalized.includes('complet') ? 'bg-green-100 text-green-700' : normalized.includes('prepar') || normalized.includes('progress') ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'
    : normalized.includes('paid') && !normalized.includes('unpaid') ? 'bg-green-100 text-green-700' : normalized.includes('partial') ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${color}`}>{value}</span>;
}

function formatMoney(value: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

export default function OrdersHistoryPage() {
  const { t, i18n } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [panelOpen, setPanelOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const page = Math.max(1, Number(params.get('page') || 1));
  const pageSize = PAGE_SIZES.includes(Number(params.get('pageSize'))) ? Number(params.get('pageSize')) : 20;
  const orderNumberRaw = params.get('orderNumber');
  const orderNumber = orderNumberRaw && /^\d+$/.test(orderNumberRaw) ? Number(orderNumberRaw) : undefined;
  const status = params.get('orderStatus');
  const payment = params.get('paymentStatus');
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const [dateError, setDateError] = useState('');
  const { data: orderStatuses = [] } = useOrderStatuses(i18n.language);

  const filters: AdminHistoryFilters = useMemo(() => ({
    OrderNumber: orderNumber,
    FromUTC: localDateToUtc(from),
    ToUTC: localDateToUtc(to, true),
    PageCunt: pageSize,
    PageNumber: page,
    OrderStatus: status ? Number(status) : undefined,
    paymentStatus: payment ? Number(payment) : undefined,
  }), [orderNumber, from, to, pageSize, page, status, payment]);

  const { data = [], isLoading, isFetching, isError, error, refetch } = useOrderHistory(filters);
  const hasNext = data.length === pageSize;
  const currency = getCurrency();

  useEffect(() => {
    const parsed = Number(searchInput.trim());
    if (!searchInput.trim() || !Number.isInteger(parsed) || parsed <= 0) return;
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params);
      next.set('orderNumber', String(parsed));
      next.set('page', '1');
      setParams(next);
      setSearchInput('');
    }, 350);
    return () => window.clearTimeout(timer);
  }, [searchInput, params, setParams]);

  useEffect(() => {
    if (isError && axios.isAxiosError(error) && error.response?.status === 401) {
      window.location.assign('/login');
    }
  }, [isError, error]);

  const changeParam = useCallback((key: string, value?: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    setParams(next);
  }, [params, setParams]);

  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(params);
    next.set('page', String(nextPage));
    setParams(next);
  };

  const reset = () => setParams({ page: '1', pageSize: String(pageSize) });

  const facets: Facet[] = [
    ...(orderNumber ? [{ key: 'orderNumber', label: t('orderHistory.facetOrderNumber', { defaultValue: 'Order Number' }), value: String(orderNumber) }] : []),
    ...(status ? [{ key: 'orderStatus', label: t('orderHistory.facetOrderStatus', { defaultValue: 'Order Status' }), value: orderStatuses.find(x => x.id === Number(status))?.name ?? status }] : []),
    ...(payment ? [{ key: 'paymentStatus', label: t('orderHistory.facetPaymentStatus', { defaultValue: 'Payment Status' }), value: PAYMENT_STATUS_LOOKUP.find(x => x.id === Number(payment))?.name ?? payment }] : []),
  ];

  const commitSearch = () => {
    const n = Number(searchInput.trim());
    if (!Number.isInteger(n) || n <= 0) {
      toast.error(t('orderHistory.invalidOrderNumber', { defaultValue: 'Order number must be a positive integer' }));
      return;
    }
    changeParam('orderNumber', String(n));
    setSearchInput('');
  };

  const chooseDateRange = (preset: 'today' | 'week' | 'month') => {
    const now = new Date();
    const start = new Date(now);
    if (preset === 'week') start.setDate(now.getDate() - 6);
    if (preset === 'month') start.setDate(1);
    const day = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const next = new URLSearchParams(params);
    next.set('from', day(start)); next.set('to', day(now)); next.set('page', '1');
    setParams(next);
  };

  const onDateChange = (key: 'from' | 'to', value: string) => {
    const other = key === 'from' ? to : from;
    if (value && other && (key === 'from' ? value > other : value < other)) {
      setDateError(t('orderHistory.invalidDateRange', { defaultValue: 'From date must not be after To date' }));
      return;
    }
    setDateError('');
    changeParam(key, value || undefined);
  };

  return (
    <main className="min-h-full bg-[#F9FAFB] p-3 text-sm text-slate-800 sm:p-5">
      <header className="mb-3">
        <div className="text-xs text-slate-500">{t('sidebar.orders', { defaultValue: 'Orders' })} /</div>
        <h1 className="text-xl font-semibold">{t('sidebar.ordersHistory', { defaultValue: 'History' })}</h1>
      </header>

      <section className="relative mb-3 flex min-h-10 flex-wrap items-center gap-1 rounded border border-[#D8DADD] bg-white px-2 py-1 focus-within:border-[#714B67] focus-within:ring-1 focus-within:ring-[#714B67]">
        <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        {facets.map(f => <span key={f.key} className="inline-flex items-center gap-1 rounded bg-[#714B67]/10 px-2 py-1 text-xs text-[#714B67]"><b>{f.label}:</b> {f.value}<button aria-label={t('orderHistory.removeFacet', { defaultValue: 'Remove filter' })} onClick={() => changeParam(f.key)} className="font-bold">×</button></span>)}
        <input aria-label={t('orderHistory.search', { defaultValue: 'Search order number' })} value={searchInput} onChange={e => setSearchInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') commitSearch(); if (e.key === 'Backspace' && !searchInput && facets.length) changeParam(facets[facets.length - 1].key); }} className="min-w-28 flex-1 border-0 bg-transparent px-1 py-1 outline-none" placeholder={t('orderHistory.searchPlaceholder', { defaultValue: 'Search…' })} />
        <button aria-label={t('orderHistory.toggleFilters', { defaultValue: 'Toggle filters' })} aria-expanded={panelOpen} onClick={() => setPanelOpen(v => !v)} className="rounded p-1 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#714B67]"><ChevronDown className="h-4 w-4" /></button>
      </section>

      {panelOpen && <section className="mb-3 grid gap-4 rounded border border-[#D8DADD] bg-white p-4 md:grid-cols-3" onKeyDown={e => { if (e.key === 'Escape') setPanelOpen(false); }}>
        <div className="space-y-2"><h2 className="font-semibold">{t('orderHistory.filters', { defaultValue: 'Filters' })}</h2>
          <label className="block">{t('orderHistory.orderStatus', { defaultValue: 'Order Status' })}<select aria-label={t('orderHistory.orderStatus', { defaultValue: 'Order Status' })} value={status ?? ''} onChange={e => changeParam('orderStatus', e.target.value || undefined)} className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1"><option value="">{t('orderHistory.all', { defaultValue: 'All' })}</option>{orderStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <label className="block">{t('orderHistory.paymentStatus', { defaultValue: 'Payment Status' })}<select aria-label={t('orderHistory.paymentStatus', { defaultValue: 'Payment Status' })} value={payment ?? ''} onChange={e => changeParam('paymentStatus', e.target.value || undefined)} className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1"><option value="">{t('orderHistory.all', { defaultValue: 'All' })}</option>{PAYMENT_STATUS_LOOKUP.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
          <div className="flex flex-wrap gap-1"><Button size="sm" variant="outline" onClick={() => chooseDateRange('today')}>{t('orderHistory.today', { defaultValue: 'Today' })}</Button><Button size="sm" variant="outline" onClick={() => chooseDateRange('week')}>{t('orderHistory.last7Days', { defaultValue: 'Last 7 days' })}</Button><Button size="sm" variant="outline" onClick={() => chooseDateRange('month')}>{t('orderHistory.thisMonth', { defaultValue: 'This month' })}</Button><Button size="sm" variant="outline" onClick={() => changeParam('paymentStatus', '1')}>{t('orderHistory.unpaid', { defaultValue: 'Unpaid' })}</Button><Button size="sm" variant="outline" onClick={() => toast.info(t('orderHistory.partialNote', { defaultValue: 'Partial payment cannot be filtered by the current API.' }))}>{t('orderHistory.partiallyPaid', { defaultValue: 'Partially paid' })}</Button><Button size="sm" variant="outline" onClick={() => changeParam('paymentStatus', '2')}>{t('orderHistory.paid', { defaultValue: 'Paid' })}</Button></div>
          <p className="text-xs text-slate-500">{t('orderHistory.partialNote', { defaultValue: 'Partial payment is derived from amounts and cannot be filtered by this API.' })}</p>
        </div>
        <div className="space-y-2"><h2 className="font-semibold">{t('orderHistory.dateRange', { defaultValue: 'Date range' })}</h2><label className="block">{t('orderHistory.from', { defaultValue: 'From' })}<input type="date" value={from} onChange={e => onDateChange('from', e.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1" /></label><label className="block">{t('orderHistory.to', { defaultValue: 'To' })}<input type="date" value={to} onChange={e => onDateChange('to', e.target.value)} className="mt-1 block w-full rounded border border-slate-300 px-2 py-1" /></label>{dateError && <p role="alert" className="text-red-600">{dateError}</p>}</div>
        <div className="flex items-start justify-end"><Button variant="link" onClick={reset}>{t('orderHistory.reset', { defaultValue: 'Reset' })}</Button></div>
      </section>}

      <section className="mb-2 flex flex-wrap items-center justify-between gap-2" aria-live="polite">
        <span className="text-xs text-slate-600">{isFetching ? t('orderHistory.loading', { defaultValue: 'Loading orders…' }) : `${data.length ? (page - 1) * pageSize + 1 : 0}-${(page - 1) * pageSize + data.length}`}</span>
        <div className="flex items-center gap-1"><select aria-label={t('orderHistory.pageSize', { defaultValue: 'Page size' })} value={pageSize} onChange={e => { const next = new URLSearchParams(params); next.set('pageSize', e.target.value); next.set('page', '1'); setParams(next); }} className="rounded border bg-white px-2 py-1">{PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}</select><Button variant="outline" size="sm" aria-label={t('orderHistory.previousPage', { defaultValue: 'Previous page' })} disabled={page <= 1 || isFetching} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button><span className="px-2">{page}</span><Button variant="outline" size="sm" aria-label={t('orderHistory.nextPage', { defaultValue: 'Next page' })} disabled={!hasNext || isFetching} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button></div>
      </section>

      {isError ? <div role="alert" className="rounded border border-red-200 bg-white p-6 text-center text-red-700">{getErrorMessage(error)} <Button variant="link" onClick={() => void refetch()}>{t('orderHistory.retry', { defaultValue: 'Retry' })}</Button></div> : data.length === 0 && !isLoading ? <div className="rounded border border-[#D8DADD] bg-white p-10 text-center"><p className="mb-3">{t('orderHistory.empty', { defaultValue: 'No orders match your filters' })}</p><Button variant="outline" onClick={reset}>{t('orderHistory.clearFilters', { defaultValue: 'Clear filters' })}</Button></div> : <OrdersTable rows={data} loading={isLoading} locale={i18n.language} currency={currency} t={t} />}
      <p className="mt-2 text-xs text-slate-500">{/* Backend improvement: return { items, totalCount } for exact pagination. */}{t('orderHistory.paginationNote', { defaultValue: 'The API does not return a total count; next-page availability is inferred from the page size.' })}</p>
    </main>
  );
}

function OrdersTable({ rows, loading, locale, currency, t }: { rows: AdminOrdersHistoryDTO[]; loading: boolean; locale: string; currency: string; t: TFunction }) {
  const headings = ['orderNumber', 'date', 'table', 'orderStatus', 'paymentStatus', 'items', 'subtotal', 'total', 'paidAmount', 'notes'];
  const labels: Record<string, string> = { orderNumber: 'Order Number', date: 'Date', table: 'Table', orderStatus: 'Order Status', paymentStatus: 'Payment Status', items: 'Items', subtotal: 'Subtotal', total: 'Total', paidAmount: 'Paid Amount', notes: 'Notes' };
  return <div className="rounded border border-[#D8DADD] bg-white"><div className="hidden overflow-x-auto md:block"><table className="min-w-full border-collapse text-[13px]"><thead className="sticky top-0 bg-white"><tr><th className="border-b border-[#D8DADD] px-3 py-2 text-start"><input type="checkbox" aria-label={t('orderHistory.selectRows', { defaultValue: 'Select rows' })} disabled /></th>{headings.map(h => <th key={h} className={`border-b border-[#D8DADD] px-3 py-2 text-start font-semibold ${['items', 'subtotal', 'total', 'paidAmount'].includes(h) ? 'text-end' : ''}`}>{t(`orderHistory.${h}`, { defaultValue: labels[h] })}</th>)}</tr></thead><tbody>
    {loading && Array.from({ length: 8 }, (_, i) => <tr key={i}>{headings.map(h => <td key={h} className="border-b border-slate-100 px-3 py-2"><div className="h-4 animate-pulse rounded bg-slate-100" /></td>)}</tr>)}
    {!loading && rows.map(row => {
      const paymentLabel = row.paidAmount > 0 && row.paidAmount < row.total
        ? t('orderHistory.partiallyPaid', { defaultValue: 'Partially paid' })
        : row.paymentStatus;
      return <tr key={row.orderId} className="hover:bg-[#F7F7F7]"><td className="border-b border-slate-100 px-3 py-2"><input type="checkbox" aria-label={`${t('orderHistory.selectOrder', { defaultValue: 'Select order' })} ${row.orderNumber}`} /></td><td className="border-b border-slate-100 px-3 py-2 font-medium">{row.orderNumber}</td><td className="border-b border-slate-100 px-3 py-2">{format(new Date(row.createdAtURC), 'yyyy-MM-dd HH:mm')}</td><td className="border-b border-slate-100 px-3 py-2">{row.tableId ? row.tableId : '—'}</td><td className="border-b border-slate-100 px-3 py-2"><StatusBadge value={row.orderStatus} kind="order" /></td><td className="border-b border-slate-100 px-3 py-2"><StatusBadge value={paymentLabel} kind="payment" /></td><td className="border-b border-slate-100 px-3 py-2 text-end">{row.totalItems}</td><td className="border-b border-slate-100 px-3 py-2 text-end">{formatMoney(row.subtotal, currency, locale)}</td><td className="border-b border-slate-100 px-3 py-2 text-end">{formatMoney(row.total, currency, locale)}</td><td className="border-b border-slate-100 px-3 py-2 text-end">{formatMoney(row.paidAmount, currency, locale)}</td><td className="max-w-48 truncate border-b border-slate-100 px-3 py-2" title={row.notes || undefined}>{row.notes || '—'}</td></tr>;
    })}
    </tbody></table></div><div className="space-y-2 p-2 md:hidden">{rows.map(row => <article key={`mobile-${row.orderId}`} className="rounded border border-slate-200 p-3"><strong>#{row.orderNumber}</strong><div>{row.orderStatus} · {row.paymentStatus}</div><div>{format(new Date(row.createdAtURC), 'yyyy-MM-dd HH:mm')} · {formatMoney(row.total, currency, locale)}</div><div className="truncate" title={row.notes || undefined}>{row.notes}</div></article>)}</div></div>;
}
