export type StatusNameValidation =
  | { ok: true; value: string }
  | { ok: false; reason: "empty" | "duplicate" };

export function validateStatusName(value: string, existingNames: string[]): StatusNameValidation {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, reason: "empty" };
  }
  const lower = trimmed.toLowerCase();
  if (existingNames.some((name) => name.trim().toLowerCase() === lower)) {
    return { ok: false, reason: "duplicate" };
  }
  return { ok: true, value: trimmed };
}