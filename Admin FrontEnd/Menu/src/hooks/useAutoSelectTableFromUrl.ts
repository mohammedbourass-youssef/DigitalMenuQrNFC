import { useEffect, useRef } from 'react';
import { useTable } from '@/contexts/TableContext';
import { useTables } from './useTables';
import { parseTableNumberPath } from '../lib/tenant';
import type { TablePublicDTO } from '../types/table';

/**
 * Seat the customer at the table their NFC tag or QR code pointed them to, once
 * the tables have loaded.
 *
 * `http://snackme.localhost/1` selects table 1. Anything else — no path
 * segment, a non-numeric one, or a number no table has — falls back to the
 * first table in the response, which the backend already returns ordered by
 * `Number` ascending, so "first" is the lowest-numbered one without re-sorting.
 *
 * Only the tables the combobox could actually offer are considered, so an
 * auto-selected table is always one the customer can see and change.
 *
 * This runs exactly once, on the first completed load. The ref latch is what
 * keeps it from re-firing on a refetch (language or currency change, a session
 * re-mint) and clobbering a table the customer picked themselves afterwards.
 */
export function useAutoSelectTableFromUrl(): void {
  const { status, tables } = useTables();
  const { tableId, tableNumber, setTable } = useTable();
  const settled = useRef(false);

  useEffect(() => {
    if (settled.current) return;
    // Wait for a real response: 'loading' covers both "not started" and
    // "waiting on a session token", and neither is a finished list.
    if (status !== 'ready') return;
    settled.current = true;

    const available: TablePublicDTO[] = tables.filter((table) => table.isAvailable);
    // 204 / no tables: nothing to select, same as before.
    if (available.length === 0) return;

    const fromUrl = parseTableNumberPath(window.location.pathname);
    if (fromUrl !== null) {
      const match = available.find((table) => table.number === fromUrl);
      // The URL is how the tag routed this customer, so it wins over a table
      // left over in storage from an earlier visit.
      if (match) {
        setTable(match);
        return;
      }
    }

    // No usable number in the path. Fall back to the first table, but never
    // overwrite a table that is already selected.
    if (tableId === null && tableNumber === null) setTable(available[0]);
  }, [status, tables, tableId, tableNumber, setTable]);
}
