import type { BoardOrderItem, BoardTableOption, OrderStatusItem } from "@/types";

const MOCK_STORAGE_KEY = "snackx.orders-board.v1";

/** Fallback statuses used when the real statuses endpoint is unavailable. */
export const MOCK_STATUSES: OrderStatusItem[] = [
  { id: 1, code: "NEW", name: "New", color: "#3B82F6", displayOrder: 1, isFinal: false, isSystem: true },
  { id: 2, code: "PREPARING", name: "Preparing", color: "#F59E0B", displayOrder: 2, isFinal: false, isSystem: true },
  { id: 3, code: "COMPLETED", name: "Completed", color: "#10B981", displayOrder: 3, isFinal: true, isSystem: true },
  { id: 4, code: "CANCELLED", name: "Cancelled", color: "#EF4444", displayOrder: 4, isFinal: true, isSystem: true },
];

export const MOCK_TABLES: BoardTableOption[] = [
  { id: "t1", name: "Table 1" },
  { id: "t2", name: "Table 2" },
  { id: "t3", name: "Table 3" },
  { id: "t4", name: "Table 4" },
  { id: "t5", name: "Table 5" },
  { id: "t6", name: "Table 6" },
  { id: "t7", name: "Table 7" },
  { id: "t8", name: "Table 8" },
  { id: "t9", name: "Table 9" },
  { id: "t10", name: "Table 10" },
  { id: "t11", name: "Table 11" },
  { id: "t12", name: "Table 12" },
];

const CURRENCY = "MAD";

function minutesAgo(mins: number): string {
  return new Date(Date.now() - mins * 60_000).toISOString();
}

function order(
  id: string,
  orderNumber: number,
  statusId: number,
  table: BoardTableOption | null,
  createdAtMinAgo: number,
  items: Array<[string, number, number]>
): BoardOrderItem {
  const lines = items.map(([name, quantity, unitPrice]) => ({
    name,
    quantity,
    unitPrice,
    lineTotal: quantity * unitPrice,
  }));
  return {
    id,
    orderNumber,
    tableId: table?.id ?? null,
    tableName: table?.name ?? null,
    statusId,
    total: lines.reduce((sum, line) => sum + line.lineTotal, 0),
    currencyCode: CURRENCY,
    createdAt: minutesAgo(createdAtMinAgo),
    items: lines,
  };
}

function seedOrders(): BoardOrderItem[] {
  const T = (n: number) => MOCK_TABLES[n - 1];
  return [
    order("o-101", 101, 1, T(3), 4, [["Mojito filtré", 2, 28], ["Jus d'orange", 1, 25]]),
    order("o-102", 102, 1, T(7), 6, [["Thé à la menthe", 1, 18], ["Croissant au beurre", 2, 12]]),
    order("o-103", 103, 1, T(1), 12, [["Cappuccino", 2, 22], ["Expresso", 1, 15]]),
    order("o-104", 104, 1, null, 20, [["Club sandwich", 2, 45], ["Frites", 2, 20]]),
    order("o-105", 105, 1, T(4), 25, [["Salade césar", 1, 48]]),
    order("o-201", 201, 2, T(2), 5, [["Tacos chawarma", 2, 38], ["Soda", 2, 12]]),
    order("o-202", 202, 2, T(8), 8, [["Tagine poulet citron", 1, 85], ["Mint tea", 2, 18]]),
    order("o-203", 203, 2, null, 11, [["Burger snack", 3, 32], ["Frites", 3, 20], ["Boisson gazeuse", 3, 12]]),
    order("o-204", 204, 2, T(5), 15, [["Pizza margherita", 1, 65]]),
    order("o-205", 205, 2, T(9), 18, [["Couscous poulet", 1, 75], ["Salade marocaine", 1, 22]]),
    order("o-301", 301, 3, T(6), 32, [["Pancakes", 2, 26], ["Jus d'ananas", 1, 22]]),
    order("o-302", 302, 3, T(10), 45, [["Crêpe chocolat", 1, 28], ["Café latte", 1, 20]]),
    order("o-303", 303, 3, null, 60, [["Panini fromage", 1, 30]]),
    order("o-401", 401, 4, T(11), 70, [["Lasagnes", 1, 58]]),
  ];
}

/** Loads the mock orders, seeding with sample data on first run. */
export function loadMockBoardOrders(): BoardOrderItem[] {
  try {
    const raw = localStorage.getItem(MOCK_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BoardOrderItem[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // corrupted storage -> fall through to a fresh seed
  }
  const seeded = seedOrders();
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(seeded));
  } catch {
    // storage unavailable; keep in-memory seed
  }
  return seeded;
}

export function saveMockBoardOrders(orders: BoardOrderItem[]): boolean {
  try {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(orders));
    return true;
  } catch {
    return false;
  }
}