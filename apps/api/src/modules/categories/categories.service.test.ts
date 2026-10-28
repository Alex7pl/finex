import assert from "node:assert/strict";
import test from "node:test";
import { Effect } from "effect";
import { CurrentUser } from "@/runtime/request-context.js";
import { CategoryRepository } from "./categories.repository.js";
import { createCategory, deleteCategory, getCategories, getCategoryById, updateCategory } from "./categories.service.js";
const user = { id: "00000000-0000-4000-8000-000000000001", email: "user@test.dev" };
const category = { id: user.id, name: "Food", kind: "expense" as const, emoji: null, color: null,
  created_at: "2026-10-19T00:00:00Z", updated_at: "2026-10-19T00:00:00Z" };
function harness() {
  let calls = 0;
  const owned = (id: string) => { assert.equal(id, user.id); calls++; };
  const repo: typeof CategoryRepository.Service = {
    list: (id, kind) => { owned(id); return Effect.succeed(kind === "income" ? [] : [category]); },
    findById: (id) => { owned(id); return Effect.succeed(null); },
    create: (id, input) => { owned(id); return Effect.succeed({ ...category, ...input }); },
    update: (id) => { owned(id); return Effect.succeed(null); },
    remove: (id) => { owned(id); return Effect.succeed(false); },
  };
  return { calls: () => calls, run: <A, E>(effect: Effect.Effect<A, E, CurrentUser | CategoryRepository>) => Effect.runPromise(
    effect.pipe(Effect.provideService(CurrentUser, user), Effect.provideService(CategoryRepository, repo), Effect.either),
  ) };
}
test("category creation trims names and validates kind, color and extra fields before DB", async () => {
  const h = harness();
  const created = await h.run(createCategory({ name: "  Food  ", kind: "expense", color: "#FF0011" }));
  assert.equal(created._tag, "Right");
  if (created._tag === "Right") assert.equal(created.right.name, "Food");
  for (const input of [{ name: " ", kind: "expense" }, { name: "Food", kind: "transfer" },
    { name: "Food", kind: "expense", color: "red" }, { name: "Food", kind: "expense", user_id: user.id }]) {
    const result = await h.run(createCategory(input));
    assert.equal(result._tag, "Left");
    if (result._tag === "Left") assert.equal(result.left._tag, "ValidationError");
  }
  assert.equal(h.calls(), 1);
});
test("category kind cannot change and missing/foreign resources share 404", async () => {
  const h = harness();
  for (const effect of [getCategoryById(user.id), updateCategory(user.id, { name: "New" }), deleteCategory(user.id)]) {
    const result = await h.run<unknown, { _tag: string }>(effect);
    assert.equal(result._tag, "Left");
    if (result._tag === "Left") assert.equal(result.left._tag, "CategoryNotFound");
  }
  for (const input of [{}, { kind: "income" }]) {
    const result = await h.run(updateCategory(user.id, input));
    assert.equal(result._tag, "Left");
    if (result._tag === "Left") assert.equal(result.left._tag, "ValidationError");
  }
  assert.equal(h.calls(), 3);
  const list = await h.run(getCategories({ kind: "income" }));
  assert.equal(list._tag, "Right");
  if (list._tag === "Right") assert.deepEqual(list.right, []);
});
