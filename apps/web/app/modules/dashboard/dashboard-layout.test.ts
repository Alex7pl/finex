import assert from "node:assert/strict";
import test from "node:test";
import {
  addWidget,
  defaultDashboardSizes,
  defaultDashboardOrder,
  moveWidget,
  removeWidget,
  resizeWidget,
  sanitizeDashboardLayout,
  sanitizeWidgetOrder,
} from "./dashboard-layout.js";

test("sanitizeWidgetOrder keeps valid unique widget ids and accepts an empty layout", () => {
  assert.deepEqual(sanitizeWidgetOrder(["goal", "balance", "goal", "unknown"]), ["goal", "balance"]);
  assert.deepEqual(sanitizeWidgetOrder([]), []);
  assert.deepEqual(sanitizeWidgetOrder("invalid"), defaultDashboardOrder);
});

test("sanitizeDashboardLayout migrates order-only layouts and enforces size limits", () => {
  const legacy = sanitizeDashboardLayout(["goal", "balance"]);
  assert.deepEqual(legacy.order, ["goal", "balance"]);
  assert.deepEqual(legacy.sizes, defaultDashboardSizes);

  const customized = sanitizeDashboardLayout({
    order: ["balance", "goal"],
    sizes: { balance: "standard", goal: "wide" },
  });
  assert.equal(customized.sizes.balance, "wide");
  assert.equal(customized.sizes.goal, "wide");
});

test("resizeWidget grows and shrinks only inside each widget's safe presets", () => {
  const grown = resizeWidget(defaultDashboardSizes, "balance", 1);
  assert.equal(grown.balance, "full");
  assert.equal(resizeWidget(grown, "balance", 1), grown);

  const shrunk = resizeWidget(grown, "balance", -1);
  assert.equal(shrunk.balance, "wide");
  assert.equal(resizeWidget(shrunk, "balance", -1), shrunk);
});

test("widget layout helpers add, remove, and reorder without mutation", () => {
  const initial = ["balance", "goal", "accounts"] as const;
  const moved = moveWidget([...initial], "accounts", 0);

  assert.deepEqual(moved, ["accounts", "balance", "goal"]);
  assert.deepEqual(initial, ["balance", "goal", "accounts"]);
  assert.deepEqual(removeWidget(moved, "balance"), ["accounts", "goal"]);
  assert.deepEqual(addWidget(["accounts", "goal"], "balance"), ["accounts", "goal", "balance"]);
  assert.deepEqual(addWidget(["accounts", "goal"], "goal"), ["accounts", "goal"]);
});
