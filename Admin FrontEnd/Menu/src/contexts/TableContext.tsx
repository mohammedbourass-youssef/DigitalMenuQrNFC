import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { TENANT, tenantScopedKey, parseTableToken } from '../lib/tenant';
import { sessionStorageGet, sessionStorageSet } from '../lib/storage';
import { getTableByToken } from '../lib/api';
import type { TablePublicDTO } from '../types/table';
import { tableLabel } from '../types/table';

const TABLE_KEY = tenantScopedKey('table');

export type TableStatus = 'idle' | 'loading' | 'ready' | 'invalid';

export interface StoredTable {
  tableId: string | null;
  number: number;
  /** Display name from the tables endpoint; null for a manually entered number. */
  name?: string | null;
  token: string | null;
  tenantSlug: string | null;
}

interface TableContextValue {
  tableId: string | null;
  tableNumber: number | null;
  /** Selected table's display name, or null when entered manually. */
  tableName: string | null;
  tableToken: string | null;
  tableStatus: TableStatus;
  /**
   * Whether a table has actually been chosen. A table picked from the list has
   * an `id` but no NFC token — `GET /api/tenant/Tables` does not return one —
   * so gating on the token alone would report "no table" while the UI shows one.
   */
  hasTable: boolean;
  /** Select a table by id from GET /api/tenant/Tables. */
  setTable: (table: TablePublicDTO) => void;
  /** Manual entry, for when no table list is available. */
  setTableNumber: (n: number) => void;
  dismissInvalid: () => void;
}

const TableContext = createContext<TableContextValue | null>(null);

export function TableProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    tableId: string | null;
    tableNumber: number | null;
    tableName: string | null;
    tableToken: string | null;
    tableStatus: TableStatus;
  }>(() => {
    const stored = sessionStorageGet<StoredTable | null>(TABLE_KEY, null);
    if (stored && stored.tenantSlug === TENANT && typeof stored.number === 'number' && stored.number > 0) {
      return {
        tableId: stored.tableId,
        tableNumber: stored.number,
        tableName: stored.name ?? null,
        tableToken: stored.token,
        tableStatus: 'ready',
      };
    }
    if (parseTableToken(window.location.pathname)) {
      return { tableId: null, tableNumber: null, tableName: null, tableToken: null, tableStatus: 'loading' };
    }
    return { tableId: null, tableNumber: null, tableName: null, tableToken: null, tableStatus: 'idle' };
  });

  const token = useToken();

  useEffect(() => {
    if (state.tableStatus !== 'loading' || !token) {
      if (state.tableStatus === 'loading' && !token) {
        setState((s) => ({ ...s, tableStatus: 'idle' }));
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const table = await getTableByToken(token);
        if (cancelled) return;
        if (table.tenantSlug !== TENANT) throw new Error('Tenant mismatch');
        sessionStorageSet(TABLE_KEY, { tableId: table.tableId, number: table.number, token, tenantSlug: table.tenantSlug });
        window.history.replaceState({}, '', '/');
        setState({ tableId: table.tableId, tableNumber: table.number, tableName: null, tableToken: token, tableStatus: 'ready' });
      } catch {
        if (cancelled) return;
        window.history.replaceState({}, '', '/');
        setState((s) => ({ ...s, tableStatus: 'invalid' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [state.tableStatus, token]);

  /**
   * Select a table from the API list. Stores both the id and the number: the id
   * is the value the order is keyed on, the number is what the UI shows.
   */
  const setTable = useCallback((table: TablePublicDTO) => {
    sessionStorageSet(TABLE_KEY, {
      tableId: table.id,
      number: table.number,
      name: tableLabel(table),
      token: null,
      tenantSlug: TENANT,
    });
    setState({
      tableId: table.id,
      tableNumber: table.number,
      tableName: tableLabel(table),
      tableToken: null,
      tableStatus: 'ready',
    });
  }, []);

  const setTableNumber = useCallback((number: number) => {
    sessionStorageSet(TABLE_KEY, { tableId: null, number, name: null, token: null, tenantSlug: TENANT });
    setState({ tableId: null, tableNumber: number, tableName: null, tableToken: null, tableStatus: 'ready' });
  }, []);

  const dismissInvalid = useCallback(() => {
    setState((s) => ({ ...s, tableStatus: 'idle' }));
  }, []);

  return (
    <TableContext.Provider
      value={{
        tableId: state.tableId,
        tableNumber: state.tableNumber,
        tableName: state.tableName,
        tableToken: state.tableToken,
        tableStatus: state.tableStatus,
        hasTable: state.tableId !== null || state.tableToken !== null,
        setTable,
        setTableNumber,
        dismissInvalid,
      }}
    >
      {children}
    </TableContext.Provider>
  );
}

/** Read the NFC token from the URL path once. */
function useToken(): string | null {
  const [token] = useState(() => parseTableToken(window.location.pathname));
  return token;
}

export function useTable() {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error('useTable must be used within TableProvider');
  return ctx;
}