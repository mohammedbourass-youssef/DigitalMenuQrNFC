/**
 * Unit tests for the tracking DTO mapping and the status-change diff.
 *
 * `compareTracking` is what decides whether the UI animates and shows a banner,
 * so the interesting cases are pinned here: first load, unchanged refresh, one
 * step forward, several steps at once, and an order that has gone away.
 *
 * Run with `npm test`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeStepState,
  mapOrderTracking,
  compareTracking,
  markJustCompleted,
  isOrderNotFound,
  classifyTrackingError,
} from '../src/lib/orderTracking.ts';
import { ApiError, NetworkError } from '../src/lib/errors.ts';

/** Minimal Line-endpoint payload for `currentStatusId` with the given steps. */
function dto({ currentStatusId = 1, steps, isFinal = false, canAddItems = true } = {}) {
  const all = steps ?? [{ statusId: 1, name: 'New order', state: 'Current' }];
  return {
    orderId: 'abc',
    orderNumber: 42,
    tableNumber: 7,
    isFinal,
    canAddItems,
    steps: all.map((s) => ({
      statusId: s.statusId,
      statusName: s.name,
      statusColor: s.color ?? '#F59E0B',
      state: s.state,
      changedAtUtc: s.changedAtUtc ?? null,
    })),
    currentStatus: {
      statusId: currentStatusId,
      statusName: all.find((s) => s.statusId === currentStatusId)?.name ?? 'New order',
      statusColor: '#F59E0B',
      state: 'Current',
      changedAtUtc: '2026-10-02T14:30:00Z',
    },
  };
}

const STEPS_1 = [
  { statusId: 1, name: 'New order', state: 'Current', changedAtUtc: '2026-10-02T14:30:00Z' },
  { statusId: 2, name: 'Preparing', state: 'Upcoming', changedAtUtc: null },
  { statusId: 3, name: 'Ready', state: 'Upcoming', changedAtUtc: null },
  { statusId: 4, name: 'Served', state: 'Upcoming', changedAtUtc: null },
];

const STEPS_4 = [
  { statusId: 1, name: 'New order', state: 'Completed', changedAtUtc: '2026-10-02T14:30:00Z' },
  { statusId: 2, name: 'Preparing', state: 'Current', changedAtUtc: '2026-10-02T14:35:00Z' },
  { statusId: 3, name: 'Ready', state: 'Upcoming', changedAtUtc: null },
  { statusId: 4, name: 'Served', state: 'Upcoming', changedAtUtc: null },
];

/* ---------------------------- normalizeStepState ---------------------------- */

test('accepts the string states', () => {
  assert.equal(normalizeStepState('Completed'), 'Completed');
  assert.equal(normalizeStepState('Current'), 'Current');
  assert.equal(normalizeStepState('Upcoming'), 'Upcoming');
});

test('accepts the numeric enum: 0/1/2', () => {
  assert.equal(normalizeStepState(0), 'Completed');
  assert.equal(normalizeStepState(1), 'Current');
  assert.equal(normalizeStepState(2), 'Upcoming');
});

test('is case- and separator-insensitive, and fails safe to Upcoming', () => {
  assert.equal(normalizeStepState('completed'), 'Completed');
  assert.equal(normalizeStepState('in_progress'), 'Current');
  assert.equal(normalizeStepState(99), 'Upcoming');
  assert.equal(normalizeStepState(null), 'Upcoming');
  assert.equal(normalizeStepState('nonsense'), 'Upcoming');
});

/* --------------------------------- mapping --------------------------------- */

test('maps the DTO into the view, preserving the step order', () => {
  const view = mapOrderTracking(dto({ currentStatusId: 2, steps: STEPS_4 }));
  assert.equal(view.orderNumber, 42);
  assert.equal(view.tableNumber, 7);
  assert.deepEqual(view.steps.map((s) => s.statusId), [1, 2, 3, 4]);
  assert.equal(view.steps[2].state, 'Upcoming');
  assert.equal(view.steps[2].changedAtUtc, null);
  assert.equal(view.currentStatus.id, 2);
  assert.equal(view.currentStatus.name, 'Preparing');
});

test('tolerates PascalCase keys', () => {
  const view = mapOrderTracking({
    OrderId: 'xyz',
    OrderNumber: 9,
    TableNumber: 3,
    IsFinal: true,
    CanAddItems: false,
    Steps: [
      { StatusId: 1, StatusName: 'New order', StatusColor: '#F59E0B', State: 0, ChangedAtUtc: '2026-10-02T14:30:00Z' },
    ],
    CurrentStatus: { StatusId: 1, StatusName: 'New order', StatusColor: '#F59E0B', State: 'Completed' },
  });
  assert.equal(view.orderId, 'xyz');
  assert.equal(view.orderNumber, 9);
  assert.equal(view.isFinal, true);
  assert.equal(view.canAddItems, false);
  // `CurrentStatus` says the order is sitting on status 1, so that row is the
  // live one even though the step reports Completed.
  assert.equal(view.steps[0].state, 'Completed');
});

test('keeps items and totals from the previous value when absent', () => {
  const rich = { ...dto({ currentStatusId: 1 }), items: [{ id: '1' }], total: 120, currencyCode: 'MAD' };
  const first = mapOrderTracking(rich);
  const refreshed = mapOrderTracking(dto({ currentStatusId: 2, steps: STEPS_4 }), first);
  assert.equal(refreshed.items.length, 1);
  assert.equal(refreshed.total, 120);
  assert.equal(refreshed.currencyCode, 'MAD');
});

test('rejects a malformed colour rather than painting with it', () => {
  const view = mapOrderTracking(
    dto({ steps: [{ statusId: 1, name: 'New order', state: 'Current', color: 'red; position:fixed' }] }),
  );
  assert.match(view.steps[0].color, /^#[0-9A-F]{6}$/i);
});

test('returns null for a missing payload', () => {
  assert.equal(mapOrderTracking(null), null);
});

/* ----------------------------- status-change diff --------------------------- */

test('first load is not a change', () => {
  const view = mapOrderTracking(dto({ currentStatusId: 1, steps: STEPS_1 }));
  const change = compareTracking(null, view);
  assert.equal(change.changed, false);
  assert.equal(change.statusName, null);
});

test('an identical refresh is not a change', () => {
  const a = mapOrderTracking(dto({ currentStatusId: 2, steps: STEPS_4 }));
  const b = mapOrderTracking(dto({ currentStatusId: 2, steps: STEPS_4 }));
  const change = compareTracking(a, b);
  assert.equal(change.changed, false);
  assert.deepEqual(change.newlyCompletedIds, []);
});

test('one step forward is a change, carrying the new name and colour', () => {
  const before = mapOrderTracking(dto({ currentStatusId: 1, steps: STEPS_1 }));
  const after = mapOrderTracking(
    dto({
      currentStatusId: 2,
      steps: STEPS_4.map((s) => ({ ...s, state: s.statusId === 1 ? 'Completed' : s.state })),
    }),
  );
  const change = compareTracking(before, after);
  assert.equal(change.changed, true);
  assert.equal(change.fromStatusId, 1);
  assert.equal(change.toStatusId, 2);
  assert.equal(change.statusName, 'Preparing');
  assert.match(change.color, /^#/);
  assert.deepEqual(change.newlyCompletedIds, [1]);
});

test('several statuses jumping at once reports every newly completed step', () => {
  const before = mapOrderTracking(dto({ currentStatusId: 1, steps: STEPS_1 }));
  // A slow poll: statuses 1 and 2 were passed through before we next looked,
  // so 3 is current and both earlier steps complete in a single refresh.
  const jumped = STEPS_4.map((s) => {
    if (s.statusId <= 2) return { ...s, state: 'Completed', changedAtUtc: '2026-10-02T14:40:00Z' };
    if (s.statusId === 3) return { ...s, state: 'Current', changedAtUtc: '2026-10-02T14:40:00Z' };
    return s;
  });
  const after = mapOrderTracking(dto({ currentStatusId: 3, steps: jumped }));
  const change = compareTracking(before, after);
  assert.equal(change.changed, true);
  assert.equal(change.fromStatusId, 1);
  assert.equal(change.toStatusId, 3);
  assert.deepEqual(change.newlyCompletedIds, [1, 2]);
});

test('moving backwards (a status correction) still counts as a change', () => {
  const before = mapOrderTracking(dto({ currentStatusId: 3, steps: STEPS_4 }));
  const after = mapOrderTracking(dto({ currentStatusId: 2, steps: STEPS_4 }));
  assert.equal(compareTracking(before, after).changed, true);
});

test('order not found: next is null, nothing animates, notFound is set', () => {
  const before = mapOrderTracking(dto({ currentStatusId: 1, steps: STEPS_4 }));
  const change = compareTracking(before, null);
  assert.equal(change.changed, false);
  assert.equal(change.notFound, true);
  assert.equal(change.statusName, null);
});

/* ------------------------------ justCompleted ------------------------------ */

test('markJustCompleted flags only the requested steps, once', () => {
  const view = mapOrderTracking(dto({ currentStatusId: 2, steps: STEPS_4 }));
  const marked = markJustCompleted(view, [1]);
  assert.equal(marked.steps[0].justCompleted, true);
  assert.equal(marked.steps[1].justCompleted, false);
  // Re-applying is idempotent.
  assert.equal(markJustCompleted(marked, [1]).steps[0].justCompleted, true);
});

test('markJustCompleted with no ids returns the same object', () => {
  const view = mapOrderTracking(dto());
  assert.equal(markJustCompleted(view, []), view);
});

/* ---------------------- failure classification ----------------------------- */

/**
 * The regression this guards: the Line endpoint returns 404 both for an order
 * that does not exist and for a rejected session. Clearing the order on the
 * wrong one destroys the customer's order; re-minting on the wrong one throws
 * away a good session and still shows an error.
 */

test('404 with ORDER_NOT_FOUND means the order is gone', () => {
  const err = new ApiError(404, 'Order not found.', 'ORDER_NOT_FOUND');
  assert.equal(isOrderNotFound(err), true);
  assert.equal(classifyTrackingError(err), 'not_found');
});

test('a bare 404 without the code is a session problem, not a missing order', () => {
  const err = new ApiError(404, 'Session not found.');
  assert.equal(isOrderNotFound(err), false);
  assert.equal(classifyTrackingError(err), 'session');
});

test('400 and 410 are session problems', () => {
  assert.equal(classifyTrackingError(new ApiError(400, 'bad session')), 'session');
  assert.equal(classifyTrackingError(new ApiError(410, 'gone')), 'session');
});

test('the code is only honoured on a 404', () => {
  // Same code on a different status is not the documented contract, and must not
  // silently clear a customer's order.
  const err = new ApiError(400, 'Order not found.', 'ORDER_NOT_FOUND');
  assert.equal(isOrderNotFound(err), false);
  assert.equal(classifyTrackingError(err), 'session');
});

test('401/403 are not session expiries — re-minting cannot fix authorization', () => {
  assert.equal(classifyTrackingError(new ApiError(401, 'unauthorized')), null);
  assert.equal(classifyTrackingError(new ApiError(403, 'forbidden')), null);
});

test('server faults and network drops are retryable, not classified', () => {
  assert.equal(classifyTrackingError(new ApiError(500, 'boom')), null);
  assert.equal(classifyTrackingError(new ApiError(502, 'bad gateway')), null);
  assert.equal(classifyTrackingError(new NetworkError()), null);
  assert.equal(classifyTrackingError(new Error('random')), null);
});

/* -------------------------------------------------------------------------- */
/* Create-order response                                                       */
/*                                                                             */
/* `POST /api/tenant/Order` returns the *same* payload as the Line refresh. It  */
/* used to be read separately against an older `{ orderID, currentStatus }`     */
/* shape, and the id silently arrived as `orderId` instead, which made a        */
/* successful 200 look like a failed send. These pin the real wire shape.        */
/* -------------------------------------------------------------------------- */

const CREATE_RESPONSE = {
  canAddItems: true,
  currentStatus: {
    changedAtUtc: '2026-09-29T15:04:05.1234567+00:00',
    state: 1,
    statusColor: '#F59E0B',
    statusId: 2,
    statusName: 'En pr�paration',
  },
  isFinal: false,
  orderId: '9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f',
  orderNumber: 4242,
  steps: [
    { statusId: 1, statusName: 'Nouvelle commande', statusColor: '#3B82F6', state: 1, changedAtUtc: '2026-09-29T15:04:00+00:00' },
    { statusId: 2, statusName: 'En pr�paration', statusColor: '#F59E0B', state: 1, changedAtUtc: '2026-09-29T15:04:05+00:00' },
    { statusId: 3, statusName: 'Pr�t', statusColor: '#10B981', state: 2, changedAtUtc: null },
    { statusId: 4, statusName: 'Servi', statusColor: '#9CA3AF', state: 2, changedAtUtc: null },
  ],
  tableNumber: 7,
};

test('create response yields a usable order id (OrderId, not orderID)', () => {
  const view = mapOrderTracking(CREATE_RESPONSE);
  assert.ok(view, 'a 200 create body must map');
  assert.equal(view.orderId, '9f1c2d3e-4a5b-6c7d-8e9f-0a1b2c3d4e5f');
  assert.equal(view.orderNumber, 4242);
  assert.equal(view.tableNumber, 7);
  assert.equal(view.isFinal, false);
  assert.equal(view.canAddItems, true);
});

test('create response currentStatus is an OrderStatusStepDto', () => {
  const view = mapOrderTracking(CREATE_RESPONSE);
  assert.equal(view.currentStatus.id, 2);
  // Rendered verbatim: the server already translated it for the request lang.
  assert.equal(view.currentStatus.name, 'En pr�paration');
  assert.equal(view.currentStatus.color, '#F59E0B');
});

test('create response keeps the backend step order and numeric states', () => {
  const view = mapOrderTracking(CREATE_RESPONSE);
  assert.deepEqual(view.steps.map((s) => s.statusId), [1, 2, 3, 4]);
  assert.deepEqual(view.steps.map((s) => s.state), ['Current', 'Current', 'Upcoming', 'Upcoming']);
});

test('an empty steps array does not invent a duplicate current step', () => {
  const view = mapOrderTracking({ ...CREATE_RESPONSE, steps: [] });
  assert.deepEqual(view.steps.map((s) => s.statusId), [2]);
  assert.equal(view.steps[0].state, 'Current');
});

test('the PascalCase legacy casing of the same payload still maps', () => {
  const view = mapOrderTracking({
    OrderId: CREATE_RESPONSE.orderId,
    OrderNumber: CREATE_RESPONSE.orderNumber,
    TableNumber: CREATE_RESPONSE.tableNumber,
    IsFinal: false,
    CanAddItems: true,
    CurrentStatus: { StatusId: 2, StatusName: 'Cooking', StatusColor: '#F59E0B', State: 'Current' },
    Steps: CREATE_RESPONSE.steps,
  });
  assert.equal(view.orderId, CREATE_RESPONSE.orderId);
  assert.equal(view.currentStatus.name, 'Cooking');
  assert.equal(view.canAddItems, true);
});
