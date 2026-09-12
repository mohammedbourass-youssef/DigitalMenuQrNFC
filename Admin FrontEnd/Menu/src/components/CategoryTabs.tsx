import { useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { categories } from '@/data';
import { Flame, Beef, Sandwich, CupSoda, Cake } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  Flame,
  Beef,
  Sandwich,
  CupSoda,
  Cake,
};

export function CategoryTabs({
  activeCategory,
  onSelect,
}: {
  activeCategory: string;
  onSelect: (id: string) => void;
}) {
  const { tl } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const button = activeRef.current;
      const containerRect = container.getBoundingClientRect();
      const buttonRect = button.getBoundingClientRect();

      const offset = buttonRect.left - containerRect.left - container.offsetWidth / 2 + button.offsetWidth / 2;
      container.scrollBy({ left: offset, behavior: 'smooth' });
    }
  }, [activeCategory]);

  return (
    <div className="sticky top-[88px] z-30 bg-white/95 backdrop-blur-lg">
      <div
        ref={scrollRef}
        className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3"
      >
        {categories.map((cat) => {
          const Icon = iconMap[cat.icon] || Flame;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              ref={isActive ? activeRef : null}
              onClick={() => onSelect(cat.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all duration-200 ${
                isActive
                  ? 'text-white shadow-md scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={isActive ? { backgroundColor: 'var(--brand-color)' } : undefined}
            >
              <Icon className="h-4 w-4" />
              {tl(cat.name)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
