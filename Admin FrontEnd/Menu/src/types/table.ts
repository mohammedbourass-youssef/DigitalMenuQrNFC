/**
 * A table as returned by GET /api/tenant/Tables.
 *
 * Mirrors the backend's table DTO for the public menu. `name` is optional in
 * practice, hence the label fallback in `tableLabel`.
 */
export interface TablePublicDTO {
  /** Guid, as a string. This is the option value and what gets stored. */
  id: string;
  number: number;
  name: string | null;
  isAvailable: boolean;
}

/** 200 returns this envelope; 204 returns no body at all. */
export interface TablesResponse {
  data: TablePublicDTO[];
}

/**
 * The option label: the table's own name, or `Table <number>` when it has none.
 *
 * Not localised — the API returns `name` as given, and the fallback stays in
 * English to match the spec rather than inventing a translated string here.
 */
export function tableLabel(table: TablePublicDTO): string {
  const name = table.name?.trim();
  return name ? name : `Table ${table.number}`;
}
