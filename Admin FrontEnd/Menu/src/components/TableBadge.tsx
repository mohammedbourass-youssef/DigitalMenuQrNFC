import { useLanguage } from '@/contexts/LanguageContext';
import { useTable } from '@/contexts/TableContext';

export function TableBadge({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();
  const { tableNumber } = useTable();

  return (
    <button
      onClick={onClick}
      className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-white px-3 text-gray-900 shadow-sm transition-transform active:scale-95"
    >
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: 'var(--brand-color)' }}
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 3v18" />
        </svg>
      </span>
      <span className="text-sm font-extrabold">
        {tableNumber === null ? t('table') : `${t('table')} ${tableNumber}`}
      </span>
      <svg
        className="h-3.5 w-3.5 text-gray-400"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}