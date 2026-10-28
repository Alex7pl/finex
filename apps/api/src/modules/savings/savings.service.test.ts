import assert from "node:assert/strict";
import test from "node:test";
import { Effect } from "effect";
import { CurrentUser } from "@/runtime/request-context.js";
import { SavingsRepository, type SavingsRow } from "./savings.repository.js";
import {
  contributeSavings,
  createSavings,
  updateSavings,
  listSavings,
  deleteSavings,
  savingsDto,
} from "./savings.service.js";
const id = "00000000-0000-4000-8000-000000000001";
const user = { id, email: "test@example.com" };
const row: SavingsRow = {
  id,
  user_id: id,
  account_id: id,
  name: "Trip",
  current_amount: "0.10",
  target_amount: "0.30",
  created_at: new Date(),
  updated_at: new Date(),
};
const repository: typeof SavingsRepository.Service = {
  list: (owner) => {
    assert.equal(owner, id);
    return Effect.succeed([row]);
  },
  create: () => Effect.succeed(row),
  update: () => Effect.succeed(row),
  adjust: () => Effect.succeed(row),
  delete: () => Effect.succeed(true),
  ownsAccount: () => Effect.succeed(true),
};
const run = <E>(
  effect: Effect.Effect<unknown, E, CurrentUser | SavingsRepository>,
  repo = repository,
) =>
  Effect.runPromise(
    effect.pipe(
      Effect.provideService(CurrentUser, user),
      Effect.provideService(SavingsRepository, repo),
      Effect.either,
    ),
  );
test("savings calculates exact progress, remaining and completion without invented forecast", () => {
  assert.equal(savingsDto(row).remaining, "0.20");
  assert.equal(savingsDto(row).progress_percent, 33.33);
  assert.equal(savingsDto(row).completed, false);
  const completed = savingsDto({ ...row, current_amount: "0.40" });
  assert.equal(completed.remaining, "0.00");
  assert.equal(completed.completed, true);
});
test("savings validates money and contributions and prevents replacing current_amount in PATCH", async () => {
  for (const target_amount of [1, "0", "-1", "1.001", "1e5", "10000000000"])
    assert.equal(
      (
        await run(
          createSavings({ name: "Trip", account_id: id, target_amount }),
        )
      )._tag,
      "Left",
    );
  for (const data of [{ current_amount: "100" }, {}, { target_amount: "0" }])
    assert.equal((await run(updateSavings(id, data)))._tag, "Left");
  for (const data of [
    { amount: "0", direction: "deposit" },
    { amount: "-1", direction: "withdraw" },
    { amount: "1", direction: "hack" },
  ])
    assert.equal((await run(contributeSavings(id, data)))._tag, "Left");
  const insufficient = await run(
    contributeSavings(id, { amount: "1", direction: "withdraw" }),
    { ...repository, adjust: () => Effect.succeed(null) },
  );
  assert.equal(insufficient._tag, "Left");
  if (insufficient._tag === "Left")
    assert.equal(insufficient.left._tag, "ValidationError");
});
test("savings checks owned account and masks missing/foreign goals in every operation", async () => {
  assert.equal(
    (
      await run(
        createSavings({ name: "Trip", account_id: id, target_amount: "10" }),
        { ...repository, ownsAccount: () => Effect.succeed(false) },
      )
    )._tag,
    "Left",
  );
  const absent = {
    ...repository,
    list: () => Effect.succeed([]),
    delete: () => Effect.succeed(false),
  };
  for (const operation of [
    listSavings({}, id),
    updateSavings(id, { name: "Other" }),
    deleteSavings(id),
    contributeSavings(id, { amount: "1", direction: "deposit" }),
  ]) {
    const result = await run(operation, absent);
    assert.equal(result._tag, "Left");
    if (result._tag === "Left")
      assert.equal(result.left._tag, "SavingsNotFound");
  }
});
