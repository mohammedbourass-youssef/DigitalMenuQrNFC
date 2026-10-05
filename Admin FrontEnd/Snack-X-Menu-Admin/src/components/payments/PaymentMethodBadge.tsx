import { memo } from "react";
import {
  Banknote,
  CircleDollarSign,
  CreditCard,
  HandCoins,
  Landmark,
  Smartphone,
  Wallet,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

/**
 * Maps the opaque `icon` string from the API onto our lucide set. The API owns
 * the names, so an unknown value falls back to a neutral wallet instead of
 * rendering nothing. Keys are matched loosely (case/underscore insensitive) so
 * `credit_card`, `creditCard` and `CREDIT-CARD` all resolve.
 */
const ICONS: Record<string, LucideIcon> = {
  banknote: Banknote,
  cash: Banknote,
  "credit-card": CreditCard,
  card: CreditCard,
  debit: CreditCard,
  credit: CreditCard,
  landmark: Landmark,
  bank: Landmark,
  "bank-transfer": Landmark,
  transfer: Landmark,
  smartphone: Smartphone,
  mobile: Smartphone,
  wallet: Wallet,
  "mobile-payment": Smartphone,
  "digital-wallet": Wallet,
  money: HandCoins,
  coins: CircleDollarSign,
};

const FALLBACK_ICON: LucideIcon = Wallet;

function normalize(icon?: string | null): string {
  return (icon ?? "").trim().toLowerCase().replace(/[\s_]+/g, "-");
}

export function iconForPaymentMethod(icon?: string | null): LucideIcon {
  const key = normalize(icon);
  return ICONS[key] ?? FALLBACK_ICON;
}

export const PAYMENT_METHOD_FALLBACK_COLOR = "#94A3B8";

interface PaymentMethodBadgeProps {
  icon?: string | null;
  color?: string | null;
  /** Accessible name; the badge itself is decorative. */
  label: string;
  size?: "sm" | "md";
}

/** Colored round icon used in the table, the select and the live preview. */
export const PaymentMethodBadge = memo(function PaymentMethodBadge({
  icon,
  color,
  label,
  size = "md",
}: PaymentMethodBadgeProps) {
  const Icon = iconForPaymentMethod(icon);
  const dimension = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const glyph = size === "sm" ? "h-3 w-3" : "h-4 w-4";

  return (
    <span
      role="img"
      aria-label={label}
      className={`${dimension} inline-flex shrink-0 items-center justify-center rounded-full text-white`}
      style={{ backgroundColor: color || PAYMENT_METHOD_FALLBACK_COLOR }}
    >
      <Icon className={glyph} aria-hidden />
    </span>
  );
});