import { useEffect, useRef, useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { safeHex, withAlpha } from '@/lib/color';
import { LayoutGrid, UtensilsCrossed } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { PublicCategory } from '@/types/category';

/**
 * Named imports rather than a dynamic `Icons[name]` lookup, which would force
 * the whole lucide set into the bundle.
 */
const ICONS: Record<string, LucideIcon> = { LayoutGrid };

/** Circular thumbnail, or a tinted icon well when the category has no image. */
function CategoryThumb({ category }: { category: PublicCategory }) {
  const [failed, setFailed] = useState(false);
  const accent = safeHex(category.color, '#E85D04');

  if (!category.image || failed) {
    const Glyph = (category.icon && ICONS[category.icon]) || UtensilsCrossed;
    return (
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: withAlpha(accent, 0.14, 'transparent') }}
      >
        <Glyph className="h-4 w-4" style={{ color: accent }} />
      </span>
    );
  }

  return (
    <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100">
      <img
        src={category.image}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </span>
  );
}

function CategoryPill({
  category,
  active,
  onSelect,
}: {
  category: PublicCategory;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const accent = safeHex(category.color, '#E85D04');

  return (
    <button
      type="button"
      onClick={() => onSelect(category.id)}
      data-category-id={category.id}
      role="tab"
      aria-selected={active}
      style={
        active
          ? {
              borderColor: accent,
              backgroundColor: withAlpha(accent, 0.1, 'transparent'),
              color: accent,
            }
          : { borderColor: 'transparent' }
      }
      className={`flex h-14 shrink-0 items-center gap-2 rounded-full border-2 ps-1 pe-4 transition-transform duration-200 active:scale-95 ${
        active ? 'shadow-sm' : 'bg-gray-100 text-gray-700'
      }`}
    >
      <CategoryThumb category={category} />
      <span className="whitespace-nowrap text-sm font-extrabold">{category.name}</span>
    </button>
  );
}

function PillSkeleton() {
  return (
    <div
      className="flex h-14 shrink-0 animate-pulse items-center gap-2 rounded-full bg-gray-100 ps-1 pe-4"
      aria-hidden="true"
    >
      <span className="h-9 w-9 shrink-0 rounded-full bg-gray-200" />
      <span className="h-3 w-16 rounded bg-gray-200" />
    </div>
  );
}

/**
 * Horizontal, always-visible row of category pills directly under the header.
 * Selecting a pill filters the menu grid to that category.
 *
 * RTL: the document-level `dir` set by LanguageContext flips flex `row` and
 * scroll origin on its own, so pill order and scroll direction mirror without
 * extra work. The centre-active-pill maths uses physical-pixel deltas from
 * `getBoundingClientRect`, so it is direction-agnostic.
 */
export function CategoryTabs({
  activeCategory,
  onSelect,
}: {
  activeCategory: string | null;
  onSelect: (id: string) => void;
}) {
  const { status, categories } = useCategories();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the active pill in view as it changes, and on first paint. The pill is
  // located by data attribute rather than a ref callback, which would be
  // re-invoked for every pill on every render.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !activeCategory) return;
    const pill = container.querySelector<HTMLButtonElement>(
      `[data-category-id="${CSS.escape(activeCategory)}"]`,
    );
    if (!pill) return;
    const offset =
      pill.getBoundingClientRect().left -
      container.getBoundingClientRect().left -
      container.offsetWidth / 2 +
      pill.offsetWidth / 2;
    container.scrollBy({ left: offset, behavior: 'smooth' });
  }, [activeCategory, status]);

  // Nothing to show when the list is empty. While loading, skeleton pills
  // stand in for a spinner.
  const showSkeleton = status === 'loading';
  if (!showSkeleton && categories.length === 0) return null;

  return (
    <div className="relative z-20 shrink-0 border-b border-gray-200/80 bg-white/95 backdrop-blur">
      <div ref={scrollRef} className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2" role="tablist">
        {showSkeleton
          ? Array.from({ length: 5 }, (_, i) => <PillSkeleton key={i} />)
          : categories.map((category) => (
              <CategoryPill
                key={category.id}
                category={category}
                active={category.id === activeCategory}
                onSelect={onSelect}
              />
            ))}
      </div>
    </div>
  );
}
