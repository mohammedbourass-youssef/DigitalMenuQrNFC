/** Payment statuses have no listing endpoint. IDs mirror backend seed data. */
export const PAYMENT_STATUS_LOOKUP = [
  { id: 1, code: 'UNPAID', name: 'Unpaid' },
  { id: 2, code: 'PAID', name: 'Paid' },
] as const;

export const ORDER_STATUS_COLORS: Record<string, string> = {
  NEW: '#3B82F6',
  PREPARING: '#F59E0B',
  COMPLETED: '#10B981',
  CANCELLED: '#EF4444',
};
