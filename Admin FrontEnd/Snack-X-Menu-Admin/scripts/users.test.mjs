import assert from "node:assert/strict";
import test from "node:test";

import {
  filterUsers,
  getSystemRoleKey,
  getUserRoleNames,
  paginateUsers,
  searchUsers,
  sortUsers,
} from "../src/lib/users.ts";

const user = (overrides = {}) => ({
  id: "id-1",
  fullName: "Alice Smith",
  email: "alice@example.com",
  systemRole: "TenantStaff",
  roleNames: ["Shift supervisor"],
  isActive: true,
  emailConfirmed: true,
  lastLoginAt: "2026-01-01T10:00:00Z",
  createdAtUTC: "2026-01-01T08:00:00Z",
  ...overrides,
});

test("getUserRoleNames returns custom roles only", () => {
  assert.deepEqual(getUserRoleNames(user()), ["Shift supervisor"]);
});

test("getUserRoleNames returns empty for missing roles", () => {
  assert.deepEqual(getUserRoleNames(user({ roleNames: [] })), []);
});

test("getSystemRoleKey maps known system roles", () => {
  assert.equal(getSystemRoleKey("TenantOwner"), "users.systemRoles.tenantOwner");
  assert.equal(getSystemRoleKey("TenantStaff"), "users.systemRoles.tenantStaff");
  assert.equal(getSystemRoleKey("SuperAdmin"), "users.systemRoles.superAdmin");
  assert.equal(getSystemRoleKey("Unknown"), "");
});

test("searchUsers matches name, email, role names, and system role", () => {
  const users = [user(), user({ fullName: "Bob Jones", email: "bob@example.com" })];

  assert.deepEqual(searchUsers(users, "alice"), [users[0]]);
  assert.deepEqual(searchUsers(users, "bob"), [users[1]]);

  assert.deepEqual(searchUsers(users, "supervisor"), users);
  assert.deepEqual(searchUsers(users, "example.com"), [users[0], users[1]]);
  assert.deepEqual(searchUsers(users, "tenantstaff"), users);
  assert.deepEqual(searchUsers(users, "zzz"), []);
});

test("filterUsers filters by status and verification", () => {
  const users = [
    user(),
    user({ id: "2", isActive: false, emailConfirmed: false }),
  ];

  assert.deepEqual(filterUsers(users, "active", "all"), [users[0]]);
  assert.deepEqual(filterUsers(users, "inactive", "all"), [users[1]]);
  assert.deepEqual(filterUsers(users, "all", "verified"), [users[0]]);
  assert.deepEqual(filterUsers(users, "all", "unverified"), [users[1]]);
  assert.deepEqual(filterUsers(users, "inactive", "verified"), []);
});

test("sortUsers sorts by name and date with null last", () => {
  const users = [
    user({ id: "b", fullName: "Bob", lastLoginAt: null }),
    user({ id: "a", fullName: "Alice" }),
  ];

  assert.deepEqual(sortUsers(users, "name", "asc", "en").map((u) => u.id), [
    "a",
    "b",
  ]);
  assert.deepEqual(sortUsers(users, "name", "desc", "en").map((u) => u.id), [
    "b",
    "a",
  ]);

  const recent = user({ createdAtUTC: "2026-02-01T00:00:00Z" });
  const old = user({ id: "old", createdAtUTC: "2026-01-01T00:00:00Z" });
  assert.deepEqual(
    sortUsers([old, recent], "createdAt", "desc", "en").map((u) => u.id),
    [recent.id, old.id]
  );
});

test("paginateUsers clamps page and reports range", () => {
  const users = Array.from({ length: 25 }, (_, i) => user({ id: String(i) }));

  const page = paginateUsers(users, 1, 10);
  assert.equal(page.page, 1);
  assert.equal(page.pageCount, 3);
  assert.equal(page.from, 1);
  assert.equal(page.to, 10);
  assert.equal(page.total, 25);
  assert.equal(page.items.length, 10);

  const last = paginateUsers(users, 99, 10);
  assert.equal(last.page, 3);
  assert.equal(last.from, 21);
  assert.equal(last.to, 25);
});
