import { useMenuItems } from '@/hooks/useMenuItems';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { refreshMenuItems } from '@/lib/menuItemsStore';
import { ALL_CATEGORY_ID } from '@/data/allCategory';
import type { MenuItemPublicDTO } from '@/types/menuItem';
import { MenuItemCard } from './MenuItemCard';
import { SearchX, WifiOff } from 'lucide-react';

/** How many placeholder cards to show while a scope loads. */
const SKELETON_COUNT = 6;

function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="aspect-[4/3] animate-pulse bg-gray-200" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-200" />
        <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
      </div>
    </div>
  );
}

/**
 * Skeleton cards rather than a spinner, so the layout does not jump when the
 * real cards arrive and the count roughly matches a typical category.
 */
function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 px-4 pt-4" aria-hidden="true">
      {Array.from({ length: SKELETON_COUNT }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

interface MenuItemsGridProps {
  /** The active category, or the frontend "All" tab. */
  activeCategoryId: string | null;
  onItemClick: (item: MenuItemPublicDTO) => void;
}

export function MenuItemsGrid({ activeCategoryId, onItemClick }: MenuItemsGridProps) {
  const { t, lang } = useLanguage();
  const { displayCurrency } = useCurrency();
  // "All" means no category scope, which the service sends as getAll=true. Any
  // other id is a real category filter.
  const categoryId = activeCategoryId === ALL_CATEGORY_ID ? null : activeCategoryId;
  const { status, items } = useMenuItems(categoryId);

  if (status === 'loading') return <GridSkeleton />;

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <WifiOff className="h-10 w-10 text-gray-300" />
        <p className="text-sm font-bold text-gray-500">{t('loadError')}</p>
        <button
          type="button"
          onClick={() => {
            void refreshMenuItems(lang, categoryId, displayCurrency);
          }}
          className="mt-1 flex h-11 items-center justify-center rounded-2xl bg-brand px-8 text-sm font-extrabold text-white shadow-lg transition-transform active:scale-[0.98]"
        >
          {t('retry')}
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <SearchX className="mb-1 h-12 w-12 text-gray-300" />
        <p className="text-base font-bold text-gray-500">{t('noItemsHere')}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4 pb-2 pt-4">
      {items.map((item) => (
        <MenuItemCard key={item.id} item={item} onClick={onItemClick} />
      ))}
    </div>
  );
}
