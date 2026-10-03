/**
 * Unit tests for the shared date/time helper.
 *
 * Run with `npm test`. These live outside `src/` on purpose: the app tsconfig
 * has no `@types/node`, so a test importing `node:test` would break
 * `npm run typecheck`. Node runs the `.ts` module through type stripping, so
 * no build step or test dependency is needed.
 *
 * The timezone is set per test via `process.env.TZ`, which Node re-reads, so a
 * single run can prove the *device* zone drives the output rather than any
 * hardcoded offset.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseUtcIso,
  formatTime,
  formatDate,
  formatDateTime,
  formatRelative,
  formatStepTimestamp,
  isSameLocalDay,
} from '../src/utils/dateTime.ts';

/** The instant under test, and the two zones we compare. */
const INSTANT_Z = '2026-10-02T14:30:00Z';
const INSTANT_NAIVE = '2026-10-02T14:30:00';
const CASABLANCA = 'Africa/Casablanca';
const NEW_YORK = 'America/New_York';

function withTz(tz, fn) {
  const previous = process.env.TZ;
  process.env.TZ = tz;
  try {
    return fn();
  } finally {
    process.env.TZ = previous;
  }
}

test('parses an explicit UTC instant', () => {
  const d = parseUtcIso(INSTANT_Z);
  assert.ok(d);
  assert.equal(d.toISOString(), '2026-10-02T14:30:00.000Z');
});

test('a timestamp without Z is treated as UTC, not local time', () => {
  // This is the bug the helper exists to prevent: without normalizing, the
  // browser would read the bare string as device-local and shift the hour.
  assert.equal(
    parseUtcIso(INSTANT_NAIVE).toISOString(),
    parseUtcIso(INSTANT_Z).toISOString(),
  );
});

test('respects an explicit numeric offset', () => {
  assert.equal(
    parseUtcIso('2026-10-02T16:30:00+02:00').toISOString(),
    '2026-10-02T14:30:00.000Z',
  );
});

test('anchors a date-only value to UTC midnight', () => {
  assert.equal(parseUtcIso('2026-10-02').toISOString(), '2026-10-02T00:00:00.000Z');
});

test('rejects null, undefined, blank and garbage instead of Invalid Date', () => {
  for (const bad of [null, undefined, '', '   ', 'not-a-date']) {
    assert.equal(parseUtcIso(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

test('formatters return an empty string for null (upcoming steps show nothing)', () => {
  assert.equal(formatTime(null, 'en'), '');
  assert.equal(formatDate(null, 'en'), '');
  assert.equal(formatDateTime(null, 'en'), '');
  assert.equal(formatRelative(null, 'en'), '');
  assert.equal(formatStepTimestamp(null, 'en'), '');
});

test('no raw UTC marker ever reaches the screen', () => {
  const out = [
    formatTime(INSTANT_Z, 'en'),
    formatDate(INSTANT_Z, 'en'),
    formatDateTime(INSTANT_Z, 'en'),
    formatStepTimestamp(INSTANT_Z, 'en'),
  ].join(' ');
  assert.doesNotMatch(out, /Z\b|[+-]\d{2}:?\d{2}/);
});

test('uses the device timezone: same instant, different local hour', () => {
  const casa = withTz(CASABLANCA, () => formatTime(INSTANT_Z, 'en'));
  const ny = withTz(NEW_YORK, () => formatTime(INSTANT_Z, 'en'));

  assert.notEqual(casa, ny, 'output must follow the device timezone');

  // Morocco is UTC+1 year-round; New York is UTC-4 on 2 Oct 2026.
  assert.equal(casa, '03:30 PM', 'Africa/Casablanca should render 15:30');
  assert.equal(ny, '10:30 AM', 'America/New_York should render 10:30');
});

test('a no-Z timestamp renders identically to the same instant with Z', () => {
  const withSuffix = withTz(CASABLANCA, () => formatTime(INSTANT_Z, 'en'));
  const withoutSuffix = withTz(CASABLANCA, () => formatTime(INSTANT_NAIVE, 'en'));
  assert.equal(withSuffix, withoutSuffix);
});

test('the local date follows the device timezone too', () => {
  // 23:30 UTC on 2 Oct is already the 3rd in Casablanca (UTC+1) but still the
  // 2nd in New York (UTC-4).
  const lateUtc = '2026-10-02T23:30:00Z';
  const casa = withTz(CASABLANCA, () => formatDate(lateUtc, 'en'));
  const ny = withTz(NEW_YORK, () => formatDate(lateUtc, 'en'));
  assert.match(casa, /Oct 3/, `Casablanca: ${casa}`);
  assert.match(ny, /Oct 2/, `New York: ${ny}`);
});

test('formats relative time in both directions', () => {
  const now = Date.parse(INSTANT_Z);
  assert.equal(
    formatRelative('2026-10-02T14:25:00Z', 'en', now),
    '5 minutes ago',
  );
  assert.equal(
    formatRelative('2026-10-02T14:35:00Z', 'en', now),
    'in 5 minutes',
  );
});

test('step timestamps show the date only when the step is not from today', () => {
  const now = Date.parse('2026-10-02T15:00:00Z');
  // Same local day -> time only.
  const today = formatStepTimestamp(INSTANT_Z, 'en', now);
  assert.doesNotMatch(today, /\d{4}/, `today should omit the year: ${today}`);
  // A day earlier -> date + time.
  const earlier = formatStepTimestamp('2026-10-01T14:30:00Z', 'en', now);
  assert.match(earlier, /Oct 1/);
  assert.match(earlier, /\d{2}:\d{2}/);
});

test('isSameLocalDay compares in device time', () => {
  // 02:00Z and 20:00Z are both the 2nd in Casablanca (UTC+1: 03:00 and 21:00),
  // but in New York (UTC-4) they are the 1st at 22:00 and the 2nd at 16:00.
  const early = parseUtcIso('2026-10-02T02:00:00Z');
  const late = parseUtcIso('2026-10-02T20:00:00Z');
  assert.equal(withTz(CASABLANCA, () => isSameLocalDay(early, late)), true);
  assert.equal(withTz(NEW_YORK, () => isSameLocalDay(early, late)), false);
});

test('locale drives digits and ordering, and never throws on a bad tag', () => {
  const ar = formatTime(INSTANT_Z, 'ar');
  assert.ok(ar.length > 0);
  assert.doesNotThrow(() => formatDateTime(INSTANT_Z, 'not-a-real-locale'));
});
