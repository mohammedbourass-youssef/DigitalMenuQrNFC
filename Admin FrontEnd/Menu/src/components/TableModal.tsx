import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTable } from '@/contexts/TableContext';
import { hapticFeedback } from '@/lib/haptics';
import { BottomSheet } from './BottomSheet';

export function TableModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const { tableNumber, setTableNumber } = useTable();
  const [value, setValue] = useState(tableNumber === null ? '' : String(tableNumber));

  useEffect(() => {
    if (open) setValue(tableNumber === null ? '' : String(tableNumber));
  }, [open, tableNumber]);

  if (!open) return null;

  const handleSave = () => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n > 0) {
      setTableNumber(n);
      hapticFeedback(10);
      onClose();
    }
  };

  return (
    <BottomSheet open={open} onDismiss={onClose} header={{ title: t('changeTable'), onClose }}>
      <div className="sheet-scroll flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-safe pt-1">
        <label className="mb-2 block text-sm font-bold text-gray-600">{t('enterTableNumber')}</label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="h-14 w-full rounded-2xl border-2 border-gray-200 px-4 text-xl font-extrabold text-gray-900 outline-none transition focus:border-brand"
          style={{ caretColor: 'var(--color-primary)' }}
          placeholder="12"
        />

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-gray-100 text-sm font-extrabold text-gray-600 transition active:bg-gray-200"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex h-14 flex-1 items-center justify-center rounded-2xl bg-brand text-sm font-extrabold text-white shadow-lg transition-transform active:scale-[0.98]"
          >
            {t('save')}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}