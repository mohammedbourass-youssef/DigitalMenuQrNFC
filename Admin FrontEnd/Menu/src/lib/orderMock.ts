import type { CurrencyCode } from './constants';
import type { LocalizedString } from '../types';
import { parseUtcIso } from '../utils/dateTime';
import type {
  CreateOrderRequest,
  OrderHistoryEntry,
  OrderItemView,
  OrderResponse,
  OrderStatusOption,
  OrderStepState,
} from '../types/order';
import type { OrderTrackingPayload } from './orderTracking';
import { getActiveLangCode } from './lang';
import { storageGet, storageRemove, storageSet } from './storage';
import { tenantScopedKey } from './tenant';
import { ApiError } from './errors';

/**
 * MOCK tracking backend, enabled with `VITE_MOCK_ORDER_LINE=true`.
 *
 * The real tracking endpoint (`GET /api/tenant/Order/{id}/Line`) is now the
 * default path. This module remains as a development stand-in and speaks the
 * same contract — same field names, same numeric step enum, same
 * `ORDER_NOT_FOUND` error code — so the mock and the backend exercise the same
 * code in `lib/orderTracking.ts`. Delete it once the kitchen backend is always
 * available; nothing in the UI imports it, only `services/orderService.ts` does.
 */

/**
 * Language the mock translates status names into.
 *
 * Read through the same request-time mirror the real endpoint uses via `X-Lang`,
 * so a language switch changes the mock's output too.
 */
const activeLang = getActiveLangCode();

/** How long the order sits in each status before advancing. */
const STEP_DURATION_MS: Record<string, number> = {
  New: 25_000,
  Preparing: 25_000,
  Ready: 25_000,
};

const ORDER_KEY = tenantScopedKey('mockOrder');
const FORCE_KEY = tenantScopedKey('mockOrderForceStatus');

/**
 * Status catalogue.
 *
 * Mirrors the shape of `OrderStatusDto`. The real tenant seeds only New /
 * Preparing / Completed / Cancelled; the mock uses the five-step set this
 * feature is designed around so the stepper and the final-status rules can be
 * exercised.
 */
const MOCK_STATUSES: OrderStatusOption[] = [
  { id: 1, code: 'New', name: mkName('New', 'جديد', 'Nouveau'), color: '#3B82F6', displayOrder: 1, isFinal: false, isSystem: true },
  { id: 2, code: 'Preparing', name: mkName('Preparing', 'قيد التحضير', 'En préparation'), color: '#F59E0B', displayOrder: 2, isFinal: false, isSystem: true },
  { id: 3, code: 'Ready', name: mkName('Ready', 'جاهز', 'Prêt'), color: '#10B981', displayOrder: 3, isFinal: false, isSystem: true },
  { id: 4, code: 'Served', name: mkName('Served', 'تم التقديم', 'Servi'), color: '#8B5CF6', displayOrder: 4, isFinal: true, isSystem: true },
  { id: 5, code: 'Cancelled', name: mkName('Cancelled', 'ملغى', 'Annulé'), color: '#EF4444', displayOrder: 99, isFinal: true, isSystem: true },
];

/** Statuses the kitchen walks through before stopping at a final one. */
const PROGRESSION = ['New', 'Preparing', 'Ready', 'Served'] as const;

/**
 * Builds a `LocalizedString` from the three languages the UI requires, then
 * back-fills the rest with English.
 *
 * The mock store holds one record for the whole order, so names cannot be
 * localised per-request; the UI resolves the active language through `tl()` and
 * falls back to English for the other six.
 */
function mkName(en: string, ar: string, fr: string): LocalizedString {
  return { en, ar, fr, es: en, it: en, de: en, ja: en, ko: en, zh: en };
}

function statusByCode(code: string): OrderStatusOption {
  const found = MOCK_STATUSES.find((s) => s.code === code);
  if (!found) throw new Error(`unknown mock status: ${code}`);
  return found;
}

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** The mock's persistent shape. Kept flat so `storageSet` stays JSON-safe. */
interface MockOrderRecord {
  orderId: string;
  orderNumber: number;
  tableNumber: number;
  createdAt: string;
  currencyCode: string;
  items: Array<{ id: string; name: LocalizedString; quantity: number; unitPrice: number; lineTotal: number }>;
  /** Index into `PROGRESSION`; clamped to the last entry for final states. */
  stepIndex: number;
  /** Set when the order was cancelled, so it never advances. */
  cancelled: boolean;
  history: OrderHistoryEntry[];
}

/* -------------------------------------------------------------------------- */
/* Test hooks                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Pins the order to a specific status so the final-state behaviour (add button
 * disabled, polling stopped) can be verified without waiting. Exposed on
 * `window` in dev builds only.
 *
 *   __orderMock.force('Served')   -> jump to a terminal status
 *   __orderMock.force(null)       -> resume automatic progression
 */
export const __orderMock = {
  force(status: string | null) {
    if (status === null) {
      storageRemove(FORCE_KEY);
      return;
    }
    const match = MOCK_STATUSES.find((s) => s.code === status);
    if (!match) throw new Error(`unknown mock status: ${status}`);
    storageSet(FORCE_KEY, match.code);
  },
  reset() {
    storageRemove(ORDER_KEY);
    storageRemove(FORCE_KEY);
  },
};

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

function read(): MockOrderRecord | null {
  return storageGet<MockOrderRecord | null>(ORDER_KEY, null);
}

function write(record: MockOrderRecord): void {
  storageSet(ORDER_KEY, record);
}

/**
 * Advances the stored order to wherever the elapsed time says it should be.
 *
 * Deriving the step from `createdAt` rather than a timer means the progression
 * survives a reload, a backgrounded tab, or a closed browser: whatever the
 * status would be at *now* is what gets returned.
 */
function advance(record: MockOrderRecord): MockOrderRecord {
  if (record.cancelled) return record;

  const forced = storageGet<string | null>(FORCE_KEY, null);
  if (forced) {
    const target = MOCK_STATUSES.find((s) => s.code === forced);
    if (target) {
      const reached = isReached(record, target.code);
      if (reached !== record.stepIndex) {
        return commit(record, target.code, reached);
      }
    }
    return record;
  }

  // `createdAt` round-trips through localStorage, which a user can hand-edit,
  // so parse it through the shared helper instead of `new Date()` directly.
  const created = parseUtcIso(record.createdAt)?.getTime() ?? Date.now();
  const elapsed = Date.now() - created;
  let total = 0;
  let index = 0;
  for (let i = 0; i < PROGRESSION.length; i++) {
    const step = STEP_DURATION_MS[PROGRESSION[i]] ?? 0;
    if (elapsed >= total) index = i;
    total += step;
  }
  return index === record.stepIndex ? record : commit(record, PROGRESSION[index], index);
}

/** Whether the timeline has already passed (or reached) `code`. */
function isReached(record: MockOrderRecord, code: string): number {
  const target = PROGRESSION.indexOf(code as (typeof PROGRESSION)[number]);
  return target === -1 ? record.stepIndex : target;
}

/** Records the transition in history, but never rewinds an existing entry. */
function commit(record: MockOrderRecord, code: string, index: number): MockOrderRecord {
  const status = statusByCode(code);
  const alreadyLogged = record.history.some((h) => h.statusCode === code);
  return {
    ...record,
    stepIndex: index,
    history: alreadyLogged
      ? record.history
      : [
          ...record.history,
          {
            statusId: status.id,
            statusCode: status.code,
            statusName: status.name,
            color: status.color ?? '#3B82F6',
            at: new Date().toISOString(),
          },
        ],
  };
}

function toResponse(record: MockOrderRecord): OrderResponse {
  const status = record.cancelled ? statusByCode('Cancelled') : statusByCode(PROGRESSION[record.stepIndex]);
  const items: OrderItemView[] = record.items.map((item) => ({ ...item }));
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  return {
    orderId: record.orderId,
    orderNumber: record.orderNumber,
    tableNumber: record.tableNumber,
    createdAt: record.createdAt,
    currencyCode: record.currencyCode as CurrencyCode,
    subtotal,
    total: subtotal,
    items,
    currentStatus: {
      id: status.id,
      code: status.code,
      name: status.name,
      color: status.color ?? '#3B82F6',
      isFinal: status.isFinal,
    },
    statusHistory: [...record.history],
  };
}

/**
 * The order rendered as the tracking DTO the real endpoint returns.
 *
 * The mock deliberately speaks the same contract as the backend — same field
 * names, same `steps` with explicit states, same `ORDER_NOT_FOUND` error code —
 * so switching `VITE_MOCK_ORDER_LINE` off exercises no code path the mock did
 * not already cover. The extra `items`/`total` fields are an app-only extension
 * the mapper carries forward; the real endpoint omits them.
 */
function toTrackingPayload(record: MockOrderRecord): OrderTrackingPayload {
  const response = toResponse(record);
  const currentStatus = response.currentStatus;

  // Cancelled replaces the happy path rather than joining it.
  const timeline = record.cancelled
    ? MOCK_STATUSES.filter((s) => s.code === 'Cancelled')
    : PROGRESSION.map((code) => statusByCode(code));

  const steps = timeline.map((status, index) => {
    const reachedAt = record.history.find((h) => h.statusCode === status.code)?.at ?? null;
    const state: OrderStepState =
      status.id === currentStatus.id ? 'Current' : index < record.stepIndex ? 'Completed' : 'Upcoming';
    return {
      statusId: status.id,
      statusName: status.name[activeLang] ?? status.name.en,
      statusColor: status.color ?? '#3B82F6',
      // Numeric on purpose: this is the branch of the enum the mapper must also
      // handle, and exercising it here keeps the mock from being the easy case.
      state: state === 'Completed' ? 0 : state === 'Current' ? 1 : 2,
      changedAtUtc: state === 'Upcoming' ? null : reachedAt,
    };
  });

  return {
    orderId: record.orderId,
    orderNumber: record.orderNumber,
    tableNumber: record.tableNumber,
    isFinal: currentStatus.isFinal,
    canAddItems: !currentStatus.isFinal,
    steps,
    currentStatus: {
      statusId: currentStatus.id,
      statusName: currentStatus.name[activeLang] ?? currentStatus.name.en,
      statusColor: currentStatus.color,
      state: 'Current',
      changedAtUtc: record.history[record.history.length - 1]?.at ?? record.createdAt,
    },
    items: response.items,
    subtotal: response.subtotal,
    total: response.total,
    currencyCode: response.currencyCode ?? undefined,
    createdAt: record.createdAt,
  };
}

/* -------------------------------------------------------------------------- */
/* Mocked endpoints                                                            */
/* -------------------------------------------------------------------------- */

/** Mock of the tracking refresh endpoint (`GET /api/tenant/Order/{id}/Line`). */
export async function mockFetchOrder(orderId: string): Promise<OrderTrackingPayload> {
  await delay(400);
  const record = read();
  if (!record || record.orderId !== orderId) {
    // The code matters: it is how the store tells "this order is gone" apart from
    // "your session expired", and the real endpoint uses the same value.
    throw new ApiError(404, 'Order not found.', 'ORDER_NOT_FOUND');
  }
  const advanced = advance(record);
  write(advanced);
  return toTrackingPayload(advanced);
}

/** Mock of the "add items to an existing order" endpoint. */
export async function mockAddItems(
  orderId: string,
  items: CreateOrderRequest['orderItems'],
  names: Record<string, LocalizedString> = {},
): Promise<OrderTrackingPayload> {
  await delay(600);
  const record = read();
  if (!record || record.orderId !== orderId) {
    throw new ApiError(404, 'Order not found.', 'ORDER_NOT_FOUND');
  }

  const advanced = advance(record);
  const current = statusByCode(PROGRESSION[advanced.stepIndex]);
  // Mirrors the rule the real endpoint is expected to enforce: a terminal order
  // cannot be modified. `IsFinal` comes from the status catalogue, never a
  // hardcoded id.
  if (current.isFinal) {
    throw new ApiError(409, 'This order is closed and cannot be changed.');
  }

  const merged = [...advanced.items];
  for (const incoming of items) {
    const existing = merged.find((item) => item.id === incoming.Id);
    if (existing) {
      existing.quantity += incoming.Quantity;
      existing.lineTotal = existing.unitPrice * existing.quantity;
    } else {
      merged.push({
        id: incoming.Id,
        name: names[incoming.Id] ?? mkName('Item', 'صنف', 'Article'),
        quantity: incoming.Quantity,
        unitPrice: incoming.UnitPrice,
        lineTotal: incoming.TotalPrice,
      });
    }
  }

  const next: MockOrderRecord = { ...advanced, items: merged };
  write(next);
  return toTrackingPayload(next);
}

/**
 * Mock of the "record a freshly created order" step, called after a real create.
 *
 * `names` is supplied by the caller from the cart rather than looked up here:
 * the menu cache is an in-memory `Map` (`lib/menuItemsStore.ts`), so there is
 * nothing persisted to read, and the real endpoint would have to fetch the menu
 * anyway. Passing them in keeps this module free of React/store dependencies.
 */
export function mockTrackCreatedOrder(
  request: CreateOrderRequest,
  orderId: string,
  names: Record<string, LocalizedString> = {},
): void {
  const items = request.orderItems.map((item) => ({
    id: item.Id,
    name: names[item.Id] ?? mkName('Item', 'صنف', 'Article'),
    quantity: item.Quantity,
    unitPrice: item.UnitPrice,
    lineTotal: item.TotalPrice,
  }));

  const now = new Date().toISOString();
  const record: MockOrderRecord = {
    orderId,
    orderNumber: 100 + Math.floor(Math.random() * 900),
    tableNumber: request.TableNumber,
    createdAt: now,
    currencyCode: request.DefaultCurrency,
    items,
    stepIndex: 0,
    cancelled: false,
    history: [
      {
        statusId: 1,
        statusCode: 'New',
        statusName: statusByCode('New').name,
        color: statusByCode('New').color ?? '#3B82F6',
        at: now,
      },
    ],
  };
  write(record);
}