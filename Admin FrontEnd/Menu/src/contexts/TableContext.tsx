import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { TENANT, tenantScopedKey, parseTableToken } from '../lib/tenant';
import { sessionStorageGet, sessionStorageSet } from '../lib/storage';
import { getTableByToken } from '../lib/api';

const TABLE_KEY = tenantScopedKey('table');

export type TableStatus = 'idle' | 'loading' | 'ready' | 'invalid';

export interface StoredTable {
  tableId: string | null;
  number: number;
  token: string | null;
  tenantSlug: string | null;
}

interface TableContextValue {
  tableId: string | null;
  tableNumber: number | null;
  tableToken: string | null;
  tableStatus: TableStatus;
  setTableNumber: (n: number) => void;
  dismissInvalid: () => void;
}

const TableContext = createContext<TableContextValue | null>(null);

export function TableProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    tableId: string | null;
    tableNumber: number | null;
    tableToken: string | null;
    tableStatus: TableStatus;
  }>(() => {
    const stored = sessionStorageGet<StoredTable | null>(TABLE_KEY, null);
    if (stored && stored.tenantSlug === TENANT && typeof stored.number === 'number' && stored.number > 0) {
      return {
        tableId: stored.tableId,
        tableNumber: stored.number,
        tableToken: stored.token,
        tableStatus: 'ready',
      };
    }
    if (parseTableToken(window.location.pathname)) {
      return { tableId: null, tableNumber: null, tableToken: null, tableStatus: 'loading' };
    }
    return { tableId: null, tableNumber: null, tableToken: null, tableStatus: 'idle' };
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
        setState({ tableId: table.tableId, tableNumber: table.number, tableToken: token, tableStatus: 'ready' });
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

  const setTableNumber = useCallback((number: number) => {
    sessionStorageSet(TABLE_KEY, { tableId: null, number, token: null, tenantSlug: TENANT });
    setState({ tableId: null, tableNumber: number, tableToken: null, tableStatus: 'ready' });
  }, []);

  const dismissInvalid = useCallback(() => {
    setState((s) => ({ ...s, tableStatus: 'idle' }));
  }, []);

  return (
    <TableContext.Provider
      value={{
        tableId: state.tableId,
        tableNumber: state.tableNumber,
        tableToken: state.tableToken,
        tableStatus: state.tableStatus,
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