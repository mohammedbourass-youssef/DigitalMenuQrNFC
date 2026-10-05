/**
 * Pure translation between the backend's tracking DTO and the view the UI uses.
 *
 * Three jobs, deliberately in one file so there is a single place to look:
 *
 * 1. **Tolerant parsing.** ASP.NET has served this app both `orderID` and
 *    `OrderID`, and `OrderStepState` may arrive as `"Completed"` or as `0`.
 *    Every such ambiguity is resolved here; the components never see it.
 * 2. **Step normalization.** `steps` is used exactly as sent - never reordered
 *    or rebuilt - with a derivation fallback for the case where the backend
 *    omits it.
 * 3. **Diffing.** `compareTracking` decides whether the UI should animate and
 *    announce a change. It is deliberately separate from rendering so it can be
 *    unit tested without a browser.
 */

import type { CurrencyCode } from './constants';
import { ApiError } from './errors';
import type {
  OrderCurrentStatus,
  OrderStepState,
  OrderTrackingView,
  TrackingStep,
  TrackingChange,
} from '../types/order';

/** Ordinal mapping used when the enum is serialised as a number. */
const STATE_BY_ORDINAL: readonly OrderStepState[] = ['Completed', 'Current', 'Upcoming'];

const STATE_ALIASES: Readonly<Record<string, OrderStepState>> = {
  completed: 'Completed',
  done: 'Completed',
  past: 'Completed',
  current: 'Current',
  active: 'Current',
  inprogress: 'Current',
  upcoming: 'Upcoming',
  pending: 'Upcoming',
  future: 'Upcoming',
  todo: 'Upcoming',
};

/** `#RGB` -> `#RRGGBB`; anything else (rgb(), named, missing) is rejected. */
const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

const FALLBACK_COLOR = '#E85D04';

/**
 * Accept `"Completed"`, `"completed"`, `0`, `1`, `2` and common aliases, and
 * return one of the three canonical states. Anything unrecognised becomes
 * `Upcoming`, which renders greyed rather than falsely claiming progress.
 */
export function normalizeStepState(value: unknown): OrderStepState {
  if (typeof value === 'number') {
    return STATE_BY_ORDINAL[value] ?? 'Upcoming';
  }
  if (typeof value !== 'string') return 'Upcoming';
  const key = value.trim().toLowerCase().replace(/[\s_-]/g, '');
  return STATE_ALIASES[key] ?? 'Upcoming';
}

/** First defined value among `keys`, so casing variants collapse to one lookup. */
function pick(source: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) return value;
  }
  return undefined;
}

function toHexColor(value: unknown): string {
  if (typeof value !== 'string') return FALLBACK_COLOR;
  const trimmed = value.trim();
  if (HEX_COLOR.test(trimmed)) {
    return trimmed.length === 4
      ? `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`
      : trimmed;
  }
  return FALLBACK_COLOR;
}

function toIsoOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Loose shape of one raw step: every known casing/alias is optional. */
export interface RawStatusStep {
  statusId?: number;
  StatusId?: number;
  statusID?: number;
  StatusID?: number;
  statusName?: string;
  StatusName?: string;
  name?: string;
  statusColor?: string;
  StatusColor?: string;
  color?: string;
  state?: OrderStepState | number | string;
  State?: OrderStepState | number | string;
  changedAtUtc?: string | null;
  ChangedAtUtc?: string | null;
  changedAt?: string | null;
  at?: string | null;
  code?: string;
  Code?: string;
}

function normalizeStep(raw: RawStatusStep, fallbackState: OrderStepState): TrackingStep {
  const source = raw as Record<string, unknown>;
  const statusId = Number(pick(source, ['statusId', 'StatusId', 'statusID', 'StatusID', 'id']));
  const state = pick(source, ['state', 'State']);
  const name = pick(source, ['statusName', 'StatusName', 'name']);
  const code = pick(source, ['code', 'Code']);

  return {
    statusId: Number.isFinite(statusId) ? statusId : 0,
    statusName: typeof name === 'string' && name ? name : '',
    color: toHexColor(pick(source, ['statusColor', 'StatusColor', 'color'])),
    state: state === undefined ? fallbackState : normalizeStepState(state),
    changedAtUtc: toIsoOrNull(
      pick(source, ['changedAtUtc', 'ChangedAtUtc', 'changedAt', 'at']),
    ),
    code: typeof code === 'string' ? code : '',
    justCompleted: false,
  };
}

/**
 * The `code` the icon mapper prefers is a stable machine string; the Line DTO
 * does not include one, so a code is reconstructed from the status name when it
 * plainly matches one of the known codes. Anything else stays empty and the icon
 * falls back to its safe default.
 */
function inferCode(step: TrackingStep): string {
  if (step.code) return step.code;
  const known = ['new', 'pending', 'preparing', 'in_progress', 'ready', 'served', 'completed', 'cancelled'];
  const lower = step.statusName.trim().toLowerCase();
  return known.includes(lower) ? lower : '';
}

/**
 * Build the ordered step list.
 *
 * The backend's list is authoritative and is never reordered. When `steps` is
 * absent we derive Completed steps from the status history plus the current
 * status, which is enough to render a timeline but cannot know what is still to
 * come - hence no fabricated Upcoming rows.
 */
function buildSteps(
  rawSteps: RawStatusStep[] | null | undefined,
  current: TrackingStep,
  history: { statusId: number; at: string | null }[],
): TrackingStep[] {
  if (Array.isArray(rawSteps) && rawSteps.length > 0) {
    return rawSteps
      .filter((step): step is RawStatusStep => !!step && typeof step === 'object')
      .map((step) => {
        const normalized = normalizeStep(step, 'Upcoming');
        return { ...normalized, code: inferCode(normalized) };
      });
  }

  const seen = new Map<number, TrackingStep>();
  for (const entry of history) {
    seen.set(entry.statusId, {
      statusId: entry.statusId,
      statusName: '',
      color: FALLBACK_COLOR,
      state: 'Completed',
      changedAtUtc: entry.at,
      code: '',
      justCompleted: false,
    });
  }
  seen.set(current.statusId, {
    ...current,
    // A step reached now has no timestamp until the backend reports one.
    changedAtUtc: current.changedAtUtc ?? current.changedAtUtc,
  });
  return [...seen.values()];
}

/** Loose shape of the whole payload: tolerant of casing and missing fields. */
export interface RawOrderTracking {  orderId?: string;
  OrderId?: string;
  orderID?: string;
  orderNumber?: number;
  OrderNumber?: number;
  tableNumber?: number;
  TableNumber?: number;
  currentStatus?: RawStatusStep;
  CurrentStatus?: RawStatusStep;
  steps?: RawStatusStep[] | null;
  Steps?: RawStatusStep[] | null;
  isFinal?: boolean;
  IsFinal?: boolean;
  canAddItems?: boolean;
  CanAddItems?: boolean;
  // Carried from richer payloads (mock / older create responses).
  createdAt?: string;
  items?: unknown;
  subtotal?: number;
  total?: number;
  currencyCode?: string;
  statusHistory?: { statusId?: number; StatusId?: number; at?: string; At?: string }[];
}

function toCurrentStatus(raw: RawStatusStep | undefined, isFinal: boolean): OrderCurrentStatus {
  const step = normalizeStep(raw ?? {}, 'Current');
  return {
    id: step.statusId,
    code: inferCode(step),
    name: step.statusName,
    color: step.color,
    isFinal,
  };
}

/**
 * Map a tracking payload to the view.
 *
 * `previous` supplies the fields the Line endpoint omits (items, totals,
 * created-at) so a refresh never blanks a section that was already on screen.
 */
export function mapOrderTracking(
  raw: RawOrderTracking | null | undefined,
  previous: OrderTrackingView | null = null,
): OrderTrackingView | null {
  if (!raw || typeof raw !== 'object') return null;

const source = raw as Record<string, unknown>;
  const isFinal = pick(source, ['isFinal', 'IsFinal']) === true;
  const current = toCurrentStatus(
    (pick(source, ['currentStatus', 'CurrentStatus']) as RawStatusStep | undefined) ?? undefined,
    isFinal,
  );

  const historyRaw = Array.isArray(raw.statusHistory) ? raw.statusHistory : [];
  const history = historyRaw.map((entry) => ({
    statusId: Number(pick(entry as Record<string, unknown>, ['statusId', 'StatusId']) ?? 0),
    at: toIsoOrNull(pick(entry as Record<string, unknown>, ['at', 'At'])),
  }));

  const steps = buildSteps(
    (pick(source, ['steps', 'Steps']) as RawStatusStep[] | null | undefined) ?? null,
{
      statusId: current.id,
      statusName: current.name,
      color: current.color,
      state: 'Current',
      changedAtUtc: null,
      code: current.code,
      justCompleted: false,
    },
    history,
  );

  const orderIdValue = pick(source, ['orderId', 'OrderId', 'orderID']);

  return {
    orderId: typeof orderIdValue === 'string' ? orderIdValue : (previous?.orderId ?? ''),
    orderNumber: Number(pick(source, ['orderNumber', 'OrderNumber']) ?? previous?.orderNumber ?? 0),
    tableNumber: Number(pick(source, ['tableNumber', 'TableNumber']) ?? previous?.tableNumber ?? 0),
    currentStatus: current,
    steps,
    statusHistory: previous?.statusHistory ?? [],
    isFinal,
    // The server's own rule. Only fall back when the field is genuinely absent.
    canAddItems:
      pick(source, ['canAddItems', 'CanAddItems']) === undefined
        ? previous?.canAddItems ?? !isFinal
        : pick(source, ['canAddItems', 'CanAddItems']) === true,
    createdAt: toIsoOrNull(raw.createdAt) ?? previous?.createdAt ?? null,
    items: (Array.isArray(raw.items) ? (raw.items as OrderTrackingView['items']) : null) ?? previous?.items ?? [],
    subtotal: typeof raw.subtotal === 'number' ? raw.subtotal : (previous?.subtotal ?? 0),
    total: typeof raw.total === 'number' ? raw.total : (previous?.total ?? 0),
    currencyCode: (raw.currencyCode as CurrencyCode | undefined) ?? previous?.currencyCode ?? null,
  };
}

/**
 * Decide whether the UI should animate and announce.
 *
 * Returns `changed: false` for the very first snapshot (nothing "changed" from
 * the customer's point of view), for an identical refresh, and when the order is
 * gone. When the order jumps several statuses in one poll, every newly completed
 * step is reported so they can all animate at once.
 */
export function compareTracking(
  previous: OrderTrackingView | null,
  next: OrderTrackingView | null,
): TrackingChange {
  const unchanged: TrackingChange = {
    changed: false,
    fromStatusId: previous?.currentStatus.id ?? null,
    toStatusId: next?.currentStatus.id ?? null,
    statusName: null,
    color: null,
    newlyCompletedIds: [],
    notFound: next === null,
  };
  if (!next) return unchanged;
  if (!previous) return unchanged;

  const fromStatusId = previous.currentStatus.id;
  const toStatusId = next.currentStatus.id;

  const previousCompleted = new Set(
    previous.steps.filter((s) => s.state === 'Completed').map((s) => s.statusId),
  );
  const newlyCompletedIds = next.steps
    .filter((s) => s.state === 'Completed' && !previousCompleted.has(s.statusId))
    .map((s) => s.statusId);

  if (toStatusId === fromStatusId && newlyCompletedIds.length === 0) return unchanged;

  return {
    changed: true,
    fromStatusId,
    toStatusId,
    statusName: next.currentStatus.name,
    color: next.currentStatus.color,
    newlyCompletedIds,
    notFound: false,
  };
}

/** Marks the given steps as freshly completed so the stepper can animate them. */
export function markJustCompleted(
  view: OrderTrackingView,
  ids: readonly number[],
): OrderTrackingView {
  if (ids.length === 0) return view;
  const wanted = new Set(ids);
  return {
    ...view,
    steps: view.steps.map((step) =>
      wanted.has(step.statusId) && !step.justCompleted ? { ...step, justCompleted: true } : step,
    ),
  };
}

/* -------------------------------------------------------------------------- */
/* Failure classification                                                       */
/*                                                                             */
/* The tracking endpoint reports two unrelated problems with overlapping status  */
/* codes: an order that does not exist (404 + `ORDER_NOT_FOUND`) and a session */
/* the server no longer accepts (400/404/410). Getting this backwards is costly */
/* in both directions - mistaking a missing order for an expired session makes  */
/* the app re-mint a perfectly good session, and the reverse strands the        */
/* customer on an order screen that will never load.                            */
/* -------------------------------------------------------------------------- */

/** Statuses the session middleware uses to reject a request. */
const SESSION_STATUSES: ReadonlySet<number> = new Set([400, 404, 410]);

/** The only code that means "this order is gone". */
const ORDER_NOT_FOUND_CODE = 'ORDER_NOT_FOUND';

/** True when the server said this order does not exist for this session. */
export function isOrderNotFound(error: unknown): boolean {
  return (
    error instanceof ApiError && error.status === 404 && error.code === ORDER_NOT_FOUND_CODE
  );
}

/**
 * Classifies a failed refresh.
 *
 * Returns `'not_found'` when the order is gone, `'session'` when the session was
 * rejected, and `null` for anything else — a network drop or a server fault the
 * caller should retry and back off from.
 *
 * A 401/403 is deliberately *not* treated as a session expiry: the customer app
 * holds no JWT, so those mean an authorization problem rather than a session one,
 * and re-minting cannot fix them.
 */
export function classifyTrackingError(error: unknown): 'not_found' | 'session' | null {
  if (isOrderNotFound(error)) return 'not_found';
  if (error instanceof ApiError && SESSION_STATUSES.has(error.status)) return 'session';
  return null;
}

/**
 * What the tracking endpoint (and the mock) hands back, before normalization.
 *
 * Typed loosely on purpose: the same payload has been served in both `camelCase`
 * and `PascalCase`, and `mapOrderTracking` is where that ambiguity is resolved.
 */
export type OrderTrackingPayload = RawOrderTracking;
