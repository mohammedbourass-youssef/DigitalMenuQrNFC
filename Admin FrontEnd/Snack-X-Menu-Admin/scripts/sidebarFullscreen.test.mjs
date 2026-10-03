import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isFullscreenBoardRoute,
  transitionSidebarOnNav,
} from "../src/lib/sidebarFullscreen.ts";

const EXPANDED = { collapsed: false, saved: null };

test("isFullscreenBoardRoute matches only the board route", () => {
  assert.equal(isFullscreenBoardRoute("/orders"), true);
  assert.equal(isFullscreenBoardRoute("/orders/history"), false);
  assert.equal(isFullscreenBoardRoute("/orders/status-settings"), false);
  assert.equal(isFullscreenBoardRoute("/dashboard"), false);
  assert.equal(isFullscreenBoardRoute("/"), false);
});

test("entering the board collapses the sidebar and keeps the previous state in the snapshot", () => {
  const next = transitionSidebarOnNav("/dashboard", "/orders", EXPANDED);
  assert.deepEqual(next, { collapsed: true, saved: false });
});

test("entering the board from an already-collapsed sidebar keeps it collapsed", () => {
  const next = transitionSidebarOnNav("/categories", "/orders", {
    collapsed: true,
    saved: null,
  });
  assert.deepEqual(next, { collapsed: true, saved: true });
});

test("staying on the board does not fight the user (no forced re-collapse)", () => {
  const manualExpand = { collapsed: false, saved: true };
  const next = transitionSidebarOnNav("/orders", "/orders", manualExpand);
  assert.equal(next, manualExpand);
});

test("leaving the board restores the sidebar to the snapshot state", () => {
  const next = transitionSidebarOnNav("/orders", "/history", { collapsed: true, saved: false });
  assert.deepEqual(next, { collapsed: false, saved: null });
});

test("leaving the board with no snapshot restores to expanded", () => {
  const next = transitionSidebarOnNav("/orders", "/tables", { collapsed: false, saved: null });
  assert.deepEqual(next, { collapsed: false, saved: null });
});

test("regular navigation leaves the sidebar untouched", () => {
  const state = { collapsed: true, saved: null };
  assert.equal(transitionSidebarOnNav("/menu-items", "/categories", state), state);
});