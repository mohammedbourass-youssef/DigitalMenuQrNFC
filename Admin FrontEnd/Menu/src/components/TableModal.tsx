import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTable } from '@/contexts/TableContext';
import { X } from 'lucide-react';

export function TableModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const { tableNumber, setTableNumber } = useTable();
  const [value, setValue] = useState(String(tableNumber));

  if (!open) return null;

  const handleSave = () => {
    const n = parseInt(value, 10);
    if (!isNaN(n) && n > 0) {
      setTableNumber(n);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 animate-fade-in" />
      <div
        className="relative w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl animate-slide-up sm:rounded-3xl safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200 sm:hidden" />
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-gray-900">{t('changeTable')}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-gray-200 active:scale-90"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <label className="mb-2 block text-sm font-semibold text-gray-600">
          {t('enterTableNumber')}
        </label>
        <input
          type="number"
          min="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3.5 text-lg font-bold text-gray-900 outline-none transition focus:border-[var(--brand-color)]"
          style={{ caretColor: 'var(--brand-color)' }}
        />

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-2xl bg-gray-100 py-3.5 text-sm font-bold text-gray-600 transition hover:bg-gray-200 active:scale-95"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            className="flex-1 rounded-2xl py-3.5 text-sm font-bold text-white shadow-lg transition active:scale-95"
            style={{ backgroundColor: 'var(--brand-color)' }}
          >
            {t('save')}
          </button>
        </div>
      </div>
    </div>
  );
}
