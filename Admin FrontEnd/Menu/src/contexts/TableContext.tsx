import { createContext, useContext, useState, type ReactNode } from 'react';

interface TableContextValue {
  tableNumber: number;
  setTableNumber: (n: number) => void;
}

const TableContext = createContext<TableContextValue | null>(null);

export function TableProvider({ children }: { children: ReactNode }) {
  const [tableNumber, setTableNumber] = useState(12);

  return (
    <TableContext.Provider value={{ tableNumber, setTableNumber }}>
      {children}
    </TableContext.Provider>
  );
}

export function useTable() {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error('useTable must be used within TableProvider');
  return ctx;
}
