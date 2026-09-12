import { UtensilsCrossed } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { restaurant } from '@/data';
import { LanguageSwitcher } from './LanguageSwitcher';
import { TableBadge } from './TableBadge';

export function Header({ onTableClick }: { onTableClick: () => void }) {
  const { tl } = useLanguage();

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-100">
      <div className="mx-auto max-w-2xl px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          {/* Logo + Name */}
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
              style={{ backgroundColor: 'var(--brand-color)' }}
            >
              <UtensilsCrossed className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-extrabold leading-tight text-gray-900">
                {tl(restaurant.name)}
              </h1>
              <p className="truncate text-xs text-gray-400">
                {tl(restaurant.tagline)}
              </p>
            </div>
          </div>

          {/* Language Switcher */}
          <LanguageSwitcher />
        </div>

        {/* Table Badge */}
        <div className="mt-3">
          <TableBadge onClick={onTableClick} />
        </div>
      </div>
    </header>
  );
}
