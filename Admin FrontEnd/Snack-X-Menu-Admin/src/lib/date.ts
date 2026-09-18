import { formatDistanceToNow } from "date-fns";

const FALLBACK = "—";

function toLocalDate(utc?: string | null): Date | null {
  if (!utc) return null;
  const date = new Date(utc);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLocalDate(utc?: string | null, locale?: string): string {
  const date = toLocalDate(utc);
  if (!date) return FALLBACK;
  return new Intl.DateTimeFormat(locale ?? undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function formatLocalDateTime(utc?: string | null, locale?: string): string {
  const date = toLocalDate(utc);
  if (!date) return FALLBACK;
  return new Intl.DateTimeFormat(locale ?? undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatLocalTime(utc?: string | null, locale?: string): string {
  const date = toLocalDate(utc);
  if (!date) return FALLBACK;
  return new Intl.DateTimeFormat(locale ?? undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatRelativeTime(utc?: string | null): string {
  const date = toLocalDate(utc);
  if (!date) return FALLBACK;
  return formatDistanceToNow(date, { addSuffix: true });
}