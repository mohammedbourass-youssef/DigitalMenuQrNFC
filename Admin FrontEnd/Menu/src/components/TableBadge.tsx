import { useLanguage } from '@/contexts/LanguageContext';
import { useTable } from '@/contexts/TableContext';

export function TableBadge({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();
  const { tableNumber } = useTable();

  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md active:scale-95"
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
      <span className="text-sm font-bold text-gray-900">
        {t('table')} {tableNumber}
      </span>
      <svg
        className="h-3.5 w-3.5 text-gray-400 transition-transform group-hover:rotate-180"
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
