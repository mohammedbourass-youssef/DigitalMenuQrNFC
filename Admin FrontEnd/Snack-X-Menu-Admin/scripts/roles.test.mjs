import assert from "node:assert/strict";
import test from "node:test";

import {
  EMPTY_ROLE_PERMISSIONS,
  buildPermissionPayload,
  buildRoleMatrixFeatures,
  buildUpdateRoleRequest,
  countEnabledPermissions,
  countPermissionedFeatures,
  filterMatrixFeatures,
  filterRoles,
  filterRolesByType,
  findRoleInList,
  getRoleNeighbors,
  getRolePermissionCounts,
  paginateRoles,
  permissionStateFromRole,
  searchRolesByName,
  serializePermissionState,
  sortRoles,
  toggleAllFeaturePermissions,
  togglePermissionAction,
} from "../src/lib/roles.ts";

const TABLES_ID = "a1000000-0000-0000-0000-000000000003";
const MENU_ID = "a1000000-0000-0000-0000-000000000001";

function role(overrides = {}) {
  return {
    id: "role-1",
    name: "Manager",
    description: "Runs the floor",
    isSystem: false,
    createdAtUTC: "2026-01-01T00:00:00Z",
    totalUsersInThisRole: 2,
    rolePermissions: [
      {
        featureId: TABLES_ID,
        roleCanAdd: true,
        roleCanRemove: false,
        roleCanEdit: true,
        roleCanRead: true,
      },
    ],
    ...overrides,
  };
}

function feature(id, name, code, isInPlan = true) {
  return {
    id,
    code,
    name,
    status: "Available",
    isInPlan,
    canRead: true,
    canAdd: true,
    canEdit: true,
    canDelete: true,
  };
}

test("filterRoles matches name, description, and feature names", () => {
  const names = new Map([[TABLES_ID, "Tables"]]);
  const rows = [
    role(),
    role({ id: "role-2", name: "Cashier", description: "Front counter", rolePermissions: [] }),
  ];

  assert.equal(filterRoles(rows, "manager").length, 1);
  assert.equal(filterRoles(rows, "counter")[0].name, "Cashier");
  assert.equal(filterRoles(rows, "tables")[0].name, "Manager");
  assert.equal(filterRoles(rows, "  ").length, 2);
  assert.equal(filterRoles(rows, "nope").length, 0);
  assert.equal(filterRoles(rows, "a1000000").length, 0);
  assert.equal(filterRoles(rows, "tables", names).length, 1);
});

test("sortRoles sorts by name, users, and creation date in both directions", () => {
  const rows = [
    role({ id: "a", name: "Bravo", totalUsersInThisRole: 1, createdAtUTC: "2026-02-01T00:00:00Z" }),
    role({ id: "b", name: "alpha", totalUsersInThisRole: 5, createdAtUTC: "2026-01-01T00:00:00Z" }),
    role({ id: "c", name: "Charlie", totalUsersInThisRole: 3, createdAtUTC: "2026-03-01T00:00:00Z" }),
  ];

  assert.deepEqual(sortRoles(rows, "name", "asc").map((row) => row.name), [
    "alpha",
    "Bravo",
    "Charlie",
  ]);
  assert.deepEqual(sortRoles(rows, "name", "desc").map((row) => row.name), [
    "Charlie",
    "Bravo",
    "alpha",
  ]);
  assert.deepEqual(sortRoles(rows, "users", "desc").map((row) => row.id), ["b", "c", "a"]);
  assert.deepEqual(sortRoles(rows, "createdAt", "asc").map((row) => row.id), ["b", "a", "c"]);
});

test("paginateRoles clamps the page and reports the visible range", () => {
  const rows = Array.from({ length: 23 }, (_, index) => role({ id: `role-${index}` }));

  const first = paginateRoles(rows, 1, 10);
  assert.deepEqual([first.page, first.pageCount, first.from, first.to, first.items.length], [1, 3, 1, 10, 10]);

  const last = paginateRoles(rows, 3, 10);
  assert.deepEqual([last.from, last.to, last.items.length], [21, 23, 3]);

  const clamped = paginateRoles(rows, 99, 10);
  assert.deepEqual([clamped.page, clamped.from, clamped.to], [3, 21, 23]);

  const empty = paginateRoles([], 1, 10);
  assert.deepEqual([empty.page, empty.pageCount, empty.from, empty.to], [1, 1, 0, 0]);
});

test("getRolePermissionCounts counts each action and only permissioned features", () => {
  const counts = getRolePermissionCounts(
    role({
      rolePermissions: [
        role().rolePermissions[0],
        { featureId: MENU_ID, roleCanAdd: false, roleCanRemove: true, roleCanEdit: true, roleCanRead: true },
        { featureId: "x", roleCanAdd: false, roleCanRemove: false, roleCanEdit: false, roleCanRead: false },
      ],
    })
  );

  assert.deepEqual(counts, { read: 2, add: 1, edit: 2, delete: 1, total: 2 });
});

test("buildRoleMatrixFeatures keeps in-plan features and preserves existing extra permissions", () => {
  const state = { [MENU_ID]: { ...EMPTY_ROLE_PERMISSIONS, read: true } };
  const rows = buildRoleMatrixFeatures(
    [feature(TABLES_ID, "Tables", "Tables"), feature(MENU_ID, "Menu", "Menu", false)],
    state
  );

  assert.deepEqual(rows.map((row) => row.id).sort(), [MENU_ID, TABLES_ID].sort());
  assert.equal(rows.find((row) => row.id === MENU_ID)?.name, "Menu");
});

test("buildPermissionPayload drops empty rows and maps flags", () => {
  const rows = [
    { id: TABLES_ID, name: "Tables" },
    { id: MENU_ID, name: "Menu" },
  ];
  const state = {
    [TABLES_ID]: { read: true, add: false, edit: true, delete: false },
    [MENU_ID]: { ...EMPTY_ROLE_PERMISSIONS },
  };

  assert.deepEqual(buildPermissionPayload(rows, state), [
    { featureId: TABLES_ID, canRead: true, canAdd: false, canEdit: true, canDelete: false },
  ]);
});

test("buildUpdateRoleRequest sends the role id, trimmed fields, and permission payload", () => {
  const request = buildUpdateRoleRequest({
    id: "  role-1  ",
    name: "  Shift supervisor  ",
    description: "  Runs the shift  ",
    rows: [{ id: TABLES_ID, name: "Tables" }],
    state: {
      [TABLES_ID]: { read: true, add: false, edit: true, delete: false },
    },
  });

  assert.deepEqual(request, {
    id: "role-1",
    name: "Shift supervisor",
    description: "Runs the shift",
    permissions: [
      {
        featureId: TABLES_ID,
        canRead: true,
        canAdd: false,
        canEdit: true,
        canDelete: false,
      },
    ],
  });
});

test("searchRolesByName matches only role names, while filterRolesByType splits system and custom", () => {
  const rows = [
    role(),
    role({ id: "role-2", name: "Cashier", description: "Manages tables", isSystem: true }),
  ];

  assert.deepEqual(searchRolesByName(rows, "man").map((row) => row.name), [
    "Manager",
  ]);
  assert.equal(searchRolesByName(rows, "tables").length, 0);
  assert.equal(searchRolesByName(rows, "  ").length, 2);
  assert.deepEqual(filterRolesByType(rows, "system").map((row) => row.id), [
    "role-2",
  ]);
  assert.deepEqual(filterRolesByType(rows, "custom").map((row) => row.id), [
    "role-1",
  ]);
  assert.equal(filterRolesByType(rows, "all").length, 2);
});

test("permission counters and serialization reflect enabled flags", () => {
  const state = {
    [TABLES_ID]: { read: true, add: true, edit: false, delete: false },
    [MENU_ID]: { ...EMPTY_ROLE_PERMISSIONS },
  };

  assert.equal(countEnabledPermissions(state), 2);
  assert.equal(countEnabledPermissions(state, [TABLES_ID, MENU_ID]), 2);
  assert.equal(countEnabledPermissions(state, [MENU_ID]), 0);
  assert.equal(countPermissionedFeatures(state), 1);
  assert.equal(countPermissionedFeatures(state, [TABLES_ID, MENU_ID]), 1);
  assert.equal(
    serializePermissionState(state),
    `${TABLES_ID.toLowerCase()}:1:1:0:0`
  );
  assert.equal(serializePermissionState({ ...state, [MENU_ID]: { read: true, add: false, edit: false, delete: false } }), [
    `${MENU_ID.toLowerCase()}:1:0:0:0`,
    `${TABLES_ID.toLowerCase()}:1:1:0:0`,
  ].join("|"));
});

test("filterMatrixFeatures searches matrix rows by name", () => {
  const rows = [
    { id: TABLES_ID, name: "Tables" },
    { id: MENU_ID, name: "Menu" },
  ];

  assert.equal(filterMatrixFeatures(rows, "tab").length, 1);
  assert.equal(filterMatrixFeatures(rows, "  ").length, 2);
  assert.equal(filterMatrixFeatures(rows, "nope").length, 0);
});

test("findRoleInList and getRoleNeighbors locate roles by id and name order", () => {
  const rows = [
    role({ id: "a", name: "Bravo" }),
    role({ id: "b", name: "alpha" }),
    role({ id: "c", name: "Charlie" }),
  ];

  assert.equal(findRoleInList(rows, "b")?.name, "alpha");
  assert.equal(findRoleInList(rows, "missing"), null);
  assert.equal(findRoleInList(rows, undefined), null);

  const neighbors = getRoleNeighbors(rows, "b");
  assert.equal(neighbors.index, 0);
  assert.equal(neighbors.total, 3);
  assert.equal(neighbors.previous, null);
  assert.equal(neighbors.next?.id, "a");

  const last = getRoleNeighbors(rows, "c");
  assert.equal(last.index, 2);
  assert.equal(last.previous?.id, "a");
  assert.equal(last.next, null);
});

test("permission toggles keep read as a prerequisite", () => {
  let state = permissionStateFromRole(role());
  assert.equal(state[TABLES_ID].read, true);

  state = togglePermissionAction(state, TABLES_ID, "add", false);
  assert.equal(state[TABLES_ID].add, false);
  assert.equal(state[TABLES_ID].read, true);

  state = togglePermissionAction(state, TABLES_ID, "edit", true);
  assert.equal(state[TABLES_ID].edit, true);
  assert.equal(state[TABLES_ID].read, true);

  state = togglePermissionAction(state, TABLES_ID, "read", false);
  assert.deepEqual(state[TABLES_ID], EMPTY_ROLE_PERMISSIONS);

  state = toggleAllFeaturePermissions(state, TABLES_ID, true);
  assert.deepEqual(state[TABLES_ID], { read: true, add: true, edit: true, delete: true });

  state = toggleAllFeaturePermissions(state, TABLES_ID, false);
  assert.deepEqual(state[TABLES_ID], EMPTY_ROLE_PERMISSIONS);
});
