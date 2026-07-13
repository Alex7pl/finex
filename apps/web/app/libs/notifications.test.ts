import assert from "node:assert/strict";
import test from "node:test";

import {
  _getItems,
  _resetStore,
  beginExit,
  getServerSnapshot,
  markVisible,
  notify,
  remove,
} from "./notifications.js";

// --- Test 1: notify() adds an item to the store ---
test("notify() adds an item to the store", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  _resetStore();

  notify("Hello");

  assert.equal(_getItems().length, 1);
  t.mock.timers.reset();
});

// --- Test 2: returned id is a non-empty string ---
test("returned id is a non-empty string", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  _resetStore();

  const id = notify("Hello");

  assert.equal(typeof id, "string");
  assert.ok(id.length > 0);
  t.mock.timers.reset();
});

// --- Test 3: default type is info when omitted ---
test("default type is info when omitted", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  _resetStore();

  notify("Hello");

  const [item] = _getItems();
  assert.equal(item?.type, "info");
  t.mock.timers.reset();
});

// --- Test 4: default duration matches per-type table ---
test("default duration matches per-type table", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  _resetStore();

  notify("A", { type: "success" });
  notify("B", { type: "info" });
  notify("C", { type: "warning" });

  const items = _getItems();
  // newest-first: C, B, A
  assert.equal(items[0]?.duration, 5000); // warning
  assert.equal(items[1]?.duration, 4000); // info
  assert.equal(items[2]?.duration, 3000); // success

  _resetStore();
  notify("X", { type: "error" });
  assert.equal(_getItems()[0]?.duration, 6000); // error
  t.mock.timers.reset();
});

// --- Test 5: convenience aliases set correct type and duration ---
test("convenience aliases set correct type and duration", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  _resetStore();

  notify.success("ok");
  assert.equal(_getItems()[0]?.type, "success");
  assert.equal(_getItems()[0]?.duration, 3000);

  _resetStore();
  notify.error("err");
  assert.equal(_getItems()[0]?.type, "error");
  assert.equal(_getItems()[0]?.duration, 6000);

  _resetStore();
  notify.info("inf");
  assert.equal(_getItems()[0]?.type, "info");
  assert.equal(_getItems()[0]?.duration, 4000);

  _resetStore();
  notify.warning("warn");
  assert.equal(_getItems()[0]?.type, "warning");
  assert.equal(_getItems()[0]?.duration, 5000);
  t.mock.timers.reset();
});

// --- Test 6: 4th notify() call evicts the oldest item (store stays at max 3) ---
test("4th notify() call evicts the oldest item and store has max 3 non-exiting items", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  _resetStore();

  notify("A");
  notify("B");
  notify("C");
  notify("D"); // D is newest, A (oldest) should be evicted to exiting

  const items = _getItems();
  // Store may have 4 items (A in exiting + D, C, B), but the non-exiting ones are at most 3
  const nonExiting = items.filter((i) => i.state !== "exiting");
  assert.ok(nonExiting.length <= 3);
  t.mock.timers.reset();
});

// --- Test 7: evicted item transitions to state exiting ---
test("evicted item transitions to state exiting", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  _resetStore();

  const idA = notify("A");
  notify("B");
  notify("C");
  notify("D"); // should evict A

  const items = _getItems();
  const evicted = items.find((i) => i.id === idA);
  assert.ok(evicted !== undefined, "evicted item should still be in store");
  assert.equal(evicted?.state, "exiting");
  t.mock.timers.reset();
});

// --- Test 8: items are ordered newest-first ---
test("items are ordered newest-first (index 0 = most recent)", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  _resetStore();

  const idA = notify("A");
  const idB = notify("B");
  const idC = notify("C");

  const items = _getItems();
  assert.equal(items[0]?.id, idC);
  assert.equal(items[1]?.id, idB);
  assert.equal(items[2]?.id, idA);
  t.mock.timers.reset();
});

// --- Test 9: initial state on insert is entering ---
test("initial state on insert is entering", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  _resetStore();

  notify("Hello");

  assert.equal(_getItems()[0]?.state, "entering");
  t.mock.timers.reset();
});

// --- Test 10: getServerSnapshot() returns [] ---
test("getServerSnapshot() returns []", () => {
  _resetStore();
  notify("something");

  const result = getServerSnapshot();
  assert.deepEqual(result, []);
});

// --- Test 11: dismiss timer does not depend on the entry animation ---
test("dismiss timer starts when notify() is called", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  _resetStore();

  const id = notify("Hello", { type: "info" }); // duration = 4000

  // The visual transition remains independent from the lifetime timer.
  markVisible(id);
  assert.equal(_getItems()[0]?.state, "visible");

  t.mock.timers.tick(4000);
  assert.equal(_getItems()[0]?.state, "exiting");
  t.mock.timers.reset();
});

// --- Test 12: dismiss timer transitions item to exiting; remove() clears it from store ---
test("dismiss timer transitions item to exiting state; remove() clears it from store", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  _resetStore();

  const id = notify("Bye", { type: "success" }); // duration = 3000

  markVisible(id);
  t.mock.timers.tick(3000); // timer fires → beginExit → state = exiting

  // Now simulate the exit animation end
  remove(id);

  assert.equal(_getItems().length, 0);
  t.mock.timers.reset();
});

// --- Test 13: animation events are not required for final removal ---
test("toast is removed after its duration without animation events", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  _resetStore();

  notify("Short lived", { duration: 750 });

  t.mock.timers.tick(749);
  assert.equal(_getItems()[0]?.state, "entering");

  t.mock.timers.tick(1);
  assert.equal(_getItems()[0]?.state, "exiting");

  t.mock.timers.tick(180);
  assert.equal(_getItems().length, 0);
  t.mock.timers.reset();
});

// --- Test 14: the close action is guaranteed to remove the toast ---
test("beginExit() removes a toast after the exit fallback", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  _resetStore();

  const id = notify("Close me", { duration: 10_000 });
  beginExit(id);
  beginExit(id); // Repeated close requests must not cancel the removal fallback.

  assert.equal(_getItems()[0]?.state, "exiting");
  t.mock.timers.tick(180);
  assert.equal(_getItems().length, 0);
  t.mock.timers.reset();
});
