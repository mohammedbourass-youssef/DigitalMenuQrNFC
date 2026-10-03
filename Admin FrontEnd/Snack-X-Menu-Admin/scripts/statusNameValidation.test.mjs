import { test } from "node:test";
import assert from "node:assert/strict";

import { validateStatusName } from "../src/lib/statusNameValidation.ts";

test("accepts a trimmed, non-duplicate name", () => {
  const result = validateStatusName("  Ready  ", ["Pending", "Served", "Completed"]);
  assert.deepEqual(result, { ok: true, value: "Ready" });
});

test("rejects an empty or whitespace-only name", () => {
  assert.deepEqual(validateStatusName("", ["Ready"]), { ok: false, reason: "empty" });
  assert.deepEqual(validateStatusName("   \t ", ["Ready"]), { ok: false, reason: "empty" });
});

test("rejects a duplicate name case-insensitively", () => {
  assert.deepEqual(validateStatusName("ready", ["Ready"]), { ok: false, reason: "duplicate" });
  assert.deepEqual(validateStatusName(" READY ", ["ready"]), { ok: false, reason: "duplicate" });
  assert.deepEqual(validateStatusName("Ready", ["Pending", "ready", "Completed"]), {
    ok: false,
    reason: "duplicate",
  });
});

test("a duplicate check does not collide with itself (case-sensitive source, case-insensitive target)", () => {
  const first = validateStatusName("Ready", []);
  assert.equal(first.ok, true);
  const second = validateStatusName("ready", first.ok ? [first.value] : []);
  assert.deepEqual(second, { ok: false, reason: "duplicate" });
});