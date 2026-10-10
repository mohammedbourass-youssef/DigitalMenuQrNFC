import { Clock, Activity } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type PaymentsNavEntry = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
};

/**
 * Centralized payments nav entries so renaming is a one-line change.
 */
export const PAYMENTS_COMING_SOON_ENTRY: PaymentsNavEntry = {
  href: '/payments/coming-soon',
  labelKey: 'sidebar.paymentsComingSoon',
  icon: Clock,
};

export const PAYMENT_STATUS_ENTRY: PaymentsNavEntry = {
  href: '/payments/payment-status',
  labelKey: 'sidebar.paymentStatus',
  icon: Activity,
};