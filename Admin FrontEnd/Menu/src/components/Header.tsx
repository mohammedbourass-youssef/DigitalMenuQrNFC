import { UtensilsCrossed } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { CurrencySwitcher } from './CurrencySwitcher';
import { TableSwitcher } from './TableSwitcher';

export function Header() {
  const { tenant } = useTenant();

  return (
    <header className="relative z-30 shrink-0 bg-brand pt-safe shadow-md">
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {tenant?.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.name}
              className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
              <UtensilsCrossed className="h-5 w-5" />
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate text-base font-extrabold leading-tight text-white">
              {tenant?.name ?? ''}
            </span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <TableSwitcher />
          <CurrencySwitcher />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}