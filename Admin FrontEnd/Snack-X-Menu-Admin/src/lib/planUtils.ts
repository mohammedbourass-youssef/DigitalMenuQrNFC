export interface ParsedUsage {
  used: number;
  total: number | null;
  percent: number | null;
}

export type PlanStatus = "active" | "expiringSoon" | "expired";

export function parseUsage(value: string): ParsedUsage {
  if (typeof value !== "string") {
    return { used: Number.NaN, total: null, percent: null };
  }

  const match = value.trim().match(/^(-?\d+(?:[.,]\d+)?)\s*\/\s*(.+?)\s*$/);
  if (!match) return { used: Number.NaN, total: null, percent: null };

  const used = Number(match[1].replace(",", "."));
  const totalText = match[2];
  if (!Number.isFinite(used)) return { used: Number.NaN, total: null, percent: null };

  if (/^(?:unlimited|∞|null)$/i.test(totalText) || totalText === "-1") {
    return { used, total: null, percent: null };
  }

  const total = Number(totalText.replace(",", "."));
  if (!Number.isFinite(total) || total < 0) return { used: Number.NaN, total: null, percent: null };

  const percent = total === 0 ? (used > 0 ? 100 : 0) : Math.min(100, Math.max(0, (used / total) * 100));
  return { used, total, percent };
}

export function getPlanStatus(isFree: boolean, expiresAt: string | null, now = new Date()): PlanStatus {
  if (isFree || expiresAt === null) return "active";

  const expiryTime = Date.parse(expiresAt);
  if (!Number.isFinite(expiryTime)) return "active";

  const remaining = expiryTime - now.getTime();
  if (remaining < 0) return "expired";
  if (remaining <= 7 * 24 * 60 * 60 * 1000) return "expiringSoon";
  return "active";
}
