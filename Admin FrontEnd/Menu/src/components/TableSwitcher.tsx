import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTable } from '@/contexts/TableContext';
import { useTables } from '@/hooks/useTables';
import { refreshTables } from '@/lib/tablesStore';
import { tableLabel } from '@/types/table';
import type { TablePublicDTO } from '@/types/table';
import { hapticFeedback } from '@/lib/haptics';
import { Check, ChevronDown, Table2 } from 'lucide-react';
import { BottomSheet } from './BottomSheet';

/**
 * Table picker, built to the same shape as `CurrencySwitcher`: a top-bar pill
 * showing the current choice, which opens a `BottomSheet` of options that
 * closes on selection.
 *
 * Options come from GET /api/tenant/Tables through the shared store, so this
 * reuses the same client, session handling and error handling as the menu and
 * category fetches. Only `isAvailable` tables are offered — an unavailable one
 * cannot be seated.
 */
export function TableSwitcher() {
  const { t } = useLanguage();
  const { tableId, tableNumber, tableName, setTable } = useTable();
  const { status, tables } = useTables();
  const [open, setOpen] = useState(false);
  // The current choice, the way the currency pill shows its own label: both
  // number and name once picked ("#17-Name"), just the number when entered
  // by hand and no name is known yet, and only the bare word when nothing is
  // selected yet.
  const selected =
    tableName && tableNumber !== null
      ? `#${tableNumber}-${tableName}`
      : tableName ?? (tableNumber === null ? null : `${t('table')} ${tableNumber}`);
  const available = tables.filter((table) => table.isAvailable);

  const handleSelect = (table: TablePublicDTO) => {
    setTable(table);
    hapticFeedback(5);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('changeTable')}
        className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-bold text-white backdrop-blur transition active:scale-95"
      >
        <Table2 className="h-3.5 w-3.5 shrink-0 opacity-90" />
        <span className="max-w-[6.5rem] truncate">{selected ?? t('table')}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </button>

      <BottomSheet
        open={open}
        onDismiss={() => setOpen(false)}
        header={{ title: t('changeTable'), onClose: () => setOpen(false) }}
      >
        <div className="sheet-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="px-4 pt-2 pb-2">
            {status === 'loading' &&
              Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="mb-2 h-14 animate-pulse rounded-2xl bg-gray-100" aria-hidden="true" />
              ))}

            {status === 'error' && (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <p className="text-sm font-bold text-gray-500">{t('loadError')}</p>
                <button
                  type="button"
                  onClick={() => {
                    void refreshTables();
                  }}
                  className="flex h-11 items-center justify-center rounded-2xl bg-brand px-8 text-sm font-extrabold text-white shadow-lg transition-transform active:scale-[0.98]"
                >
                  {t('retry')}
                </button>
              </div>
            )}

            {status === 'ready' && available.length === 0 && (
              <p className="py-8 text-center text-sm font-bold text-gray-500">{t('noItemsHere')}</p>
            )}

            {available.map((table) => {
              const active = table.id === tableId;
              return (
                <button
                  key={table.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => handleSelect(table)}
                  className={`relative flex h-14 w-full items-center gap-4 rounded-2xl px-4 text-start transition active:scale-[0.98] ${
                    active ? 'bg-brand/10 text-brand ring-1 ring-brand/20' : 'text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-sm font-bold leading-snug">{tableLabel(table)}</span>
                    <span className="text-xs font-medium text-gray-400">#{table.number}</span>
                  </span>
                  {active && <Check className="h-5 w-5 shrink-0 text-brand" />}
                </button>
              );
            })}
          </div>
        </div>
      </BottomSheet>
    </>
  );
}
