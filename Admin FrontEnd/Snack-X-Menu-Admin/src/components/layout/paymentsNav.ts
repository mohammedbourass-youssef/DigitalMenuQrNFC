import { Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PaymentsNavEntry = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
};

/**
 * TEMPORARY sidebar entry. Its real title and route are not decided yet, so
 * they live here and nowhere else: `href` and `labelKey` below are the only
 * two values to change. `Sidebar.tsx` reads them for the menu item and
 * `App.tsx` reads `href` for the route, so renaming is a one-line change.
 */
export const PAYMENTS_COMING_SOON_ENTRY: PaymentsNavEntry = {
  href: '/payments/coming-soon',
  labelKey: 'sidebar.paymentsComingSoon',
  icon: Clock,
};