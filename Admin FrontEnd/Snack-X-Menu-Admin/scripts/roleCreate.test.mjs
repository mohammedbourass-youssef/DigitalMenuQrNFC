import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCreateRoleRequest,
  parseRoleCreateError,
  readCreatedRoleId,
} from "../src/lib/roleCreate.ts";
import { buildRoleMatrixFeatures, togglePermissionAction } from "../src/lib/roles.ts";

const READ = "11111111-1111-1111-1111-111111111111";
const ADD = "22222222-2222-2222-2222-222222222222";
const EMPTY = "33333333-3333-3333-3333-333333333333";
const DELETE = "44444444-4444-4444-4444-444444444444";

function flags(overrides = {}) {
  return { read: false, add: false, edit: false, delete: false, ...overrides };
}

test("success flow: the request body is built and the returned id is used", () => {
  const id = "9d3a1c1e-0f4a-4f3e-9e3d-1a2b3c4d5e6f";
  const request = buildCreateRoleRequest({
    name: "Cashier",
    description: "Handles payments",
    rows: [{ id: READ, name: "Read only" }],
    state: { [READ]: flags({ read: true }) },
  });

  assert.equal(request.name, "Cashier");
  assert.equal(request.descriptions, "Handles payments");
  assert.equal(request.tableRole.length, 1);
  assert.equal(readCreatedRoleId({ id }), id);
});

test("permissions selected through the matrix are included in the create payload", () => {
  const feature = {
    id: "A1000000-0000-0000-0000-000000000007",
    code: "Roles",
    name: "Roles",
    status: "Active",
    isInPlan: true,
  };
  const rows = buildRoleMatrixFeatures([feature], {}, new Map([[feature.id.toLowerCase(), "Roles"]]));
  const state = togglePermissionAction({}, rows[0].id, "read", true);
  const request = buildCreateRoleRequest({
    name: "Cashier",
    description: "",
    rows,
    state,
  });

  assert.equal(rows[0].id, feature.id.toLowerCase());
  assert.deepEqual(request.tableRole, [
    {
      featureId: feature.id.toLowerCase(),
      roleCanRead: true,
      roleCanAdd: false,
      roleCanEdit: false,
      roleCanRemove: false,
    },
  ]);
});

test("create success response exposes the returned role id", () => {
  const id = "9d3a1c1e-0f4a-4f3e-9e3d-1a2b3c4d5e6f";

  assert.equal(readCreatedRoleId({ id }), id);
  assert.equal(readCreatedRoleId(null), null);
  assert.equal(readCreatedRoleId({}), null);
  assert.equal(readCreatedRoleId({ id: 42 }), null);
});

test("403 with the plan limit message is classified as a limit error", () => {
  const info = parseRoleCreateError({
    response: {
      status: 403,
      data: { error: "Roles limit reached for your plan." },
    },
  });

  assert.equal(info.kind, "limit");
  assert.equal(info.status, 403);
  assert.equal(info.message, "Roles limit reached for your plan.");
});

test("409 duplicate role name is classified so the form can mark the Name field", () => {
  const info = parseRoleCreateError({
    response: {
      status: 409,
      data: { error: "A role with this name already exists." },
    },
  });

  assert.equal(info.kind, "duplicate-name");
  assert.equal(info.status, 409);
});

test("409 limit race is still treated as a quota limit", () => {
  const info = parseRoleCreateError({
    response: {
      status: 409,
      data: { error: "Roles limit reached for your plan." },
    },
  });

  assert.equal(info.kind, "limit");
  assert.equal(info.status, 409);
});

test("Add, Edit or Delete implies Read and only enabled features are sent", () => {
  const request = buildCreateRoleRequest({
    name: "  Shift supervisor  ",
    description: "   ",
    rows: [
      { id: READ, name: "Read only" },
      { id: ADD, name: "Add only" },
      { id: ADD.toUpperCase(), name: "Duplicate add" },
      { id: EMPTY, name: "No permissions" },
      { id: DELETE, name: "Delete only" },
    ],
    state: {
      [READ]: flags({ read: true }),
      [ADD]: flags({ add: true }),
      [EMPTY]: flags(),
      [DELETE]: flags({ delete: true }),
    },
  });

  assert.equal(request.name, "Shift supervisor");
  assert.equal(request.descriptions, null);
  assert.deepEqual(request.tableRole, [
    {
      featureId: READ,
      roleCanRead: true,
      roleCanAdd: false,
      roleCanEdit: false,
      roleCanRemove: false,
    },
    {
      featureId: ADD,
      roleCanRead: true,
      roleCanAdd: true,
      roleCanEdit: false,
      roleCanRemove: false,
    },
    {
      featureId: DELETE,
      roleCanRead: true,
      roleCanAdd: false,
      roleCanEdit: false,
      roleCanRemove: true,
    },
  ]);
});

test("description is trimmed and sent as a string when present", () => {
  const request = buildCreateRoleRequest({
    name: "Cashier",
    description: "  Handles payments  ",
    rows: [],
    state: {},
  });

  assert.equal(request.descriptions, "Handles payments");
  assert.deepEqual(request.tableRole, []);
});

test("400 ModelState errors are mapped to the matching form fields", () => {
  const info = parseRoleCreateError({
    response: {
      status: 400,
      data: {
        errors: {
          Name: ["The Name field is required."],
          descriptions: ["The Descriptions field is too long."],
          "tableRole[0].FeatureId": ["The FeatureId field is required."],
        },
      },
    },
  });

  assert.equal(info.kind, "validation");
  assert.equal(info.fieldErrors.name, "The Name field is required.");
  assert.equal(info.fieldErrors.description, "The Descriptions field is too long.");
  assert.equal(info.fieldErrors.permissions, "The FeatureId field is required.");
});

test("update 400 responses with a direct field are mapped to the matching form field", () => {
  const info = parseRoleCreateError({
    response: {
      status: 400,
      data: {
        error: "Role name is required.",
        field: "Name",
      },
    },
  });

  assert.equal(info.kind, "validation");
  assert.equal(info.fieldErrors.name, "Role name is required.");
});

test("update 400 permission failures are classified as invalid permissions", () => {
  const info = parseRoleCreateError({
    response: {
      status: 400,
      data: {
        code: "FEATURE_NOT_AVAILABLE",
        error: "Feature is not available for your plan.",
        field: "Permissions",
      },
    },
  });

  assert.equal(info.kind, "invalid-permissions");
  assert.equal(info.fieldErrors.permissions, "Feature is not available for your plan.");
});

test("update 404 role failures are distinguished from tenant and plan failures", () => {
  const missing = parseRoleCreateError({
    response: {
      status: 404,
      data: { error: "Role not found." },
    },
  });
  const tenant = parseRoleCreateError({
    response: {
      status: 404,
      data: { error: "Restaurant not found." },
    },
  });
  const plan = parseRoleCreateError({
    response: {
      status: 404,
      data: { code: "PLAN_NOT_FOUND", error: "Plan not found." },
    },
  });

  assert.equal(missing.kind, "role-not-found");
  assert.equal(tenant.kind, "tenant-not-found");
  assert.equal(plan.kind, "plan-not-found");
});

test("update 403 system-role failures keep the backend message", () => {
  const info = parseRoleCreateError({
    response: {
      status: 403,
      data: { error: "System roles cannot be modified." },
    },
  });

  assert.equal(info.kind, "forbidden");
  assert.equal(info.message, "System roles cannot be modified.");
});

test("network failures are classified without a response status", () => {
  const info = parseRoleCreateError(new Error("Network Error"));

  assert.equal(info.kind, "network");
  assert.equal(info.status, null);
});
