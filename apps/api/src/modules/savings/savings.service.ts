import { Effect } from "effect";
import { z } from "zod";
import { SavingsNotFound } from "@finex/shared/savings/savings.errors.js";
import { CurrentUser } from "@/runtime/request-context.js";
import { SavingsRepository, type SavingsRow } from "./savings.repository.js";
import { cents, money, progress } from "@/shared/money.js";
import {
  invalid,
  name,
  nonNegativeMoney,
  parse,
  positiveMoney,
} from "../budgets/planning.validation.js";
const input = z.strictObject({
  name,
  account_id: z.uuid(),
  target_amount: positiveMoney,
  current_amount: nonNegativeMoney.default("0"),
});
const patch = input
  .omit({ current_amount: true })
  .partial()
  .refine((x) => Object.keys(x).length > 0, "Empty update");
export function savingsDto(row: SavingsRow) {
  const current = cents(row.current_amount),
    target = cents(row.target_amount);
  return {
    id: row.id,
    name: row.name,
    account_id: row.account_id,
    target_amount: row.target_amount,
    current_amount: row.current_amount,
    remaining: money(target > current ? target - current : 0n),
    progress_percent: progress(current, target),
    completed: current >= target,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
  };
}
export function listSavings(raw: unknown, rawId?: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const repo = yield* SavingsRepository;
    const query = yield* parse(
      z.strictObject({ accountId: z.uuid().optional() }),
      raw,
    );
    const id = rawId === undefined ? undefined : yield* parse(z.uuid(), rawId);
    if (query.accountId && !(yield* repo.ownsAccount(user.id, query.accountId)))
      return yield* Effect.fail(invalid("Unknown account"));
    const rows = yield* repo.list(user.id, query.accountId, id);
    if (id && !rows.length)
      return yield* Effect.fail(new SavingsNotFound({ id }));
    return id ? savingsDto(rows[0]!) : { items: rows.map(savingsDto) };
  });
}
export function createSavings(raw: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const repo = yield* SavingsRepository;
    const data = yield* parse(input, raw);
    if (!(yield* repo.ownsAccount(user.id, data.account_id)))
      return yield* Effect.fail(invalid("Expected an owned account"));
    return savingsDto(yield* repo.create(user.id, data));
  });
}
export function updateSavings(rawId: unknown, raw: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const repo = yield* SavingsRepository;
    const id = yield* parse(z.uuid(), rawId);
    const data = yield* parse(patch, raw);
    if (!(yield* repo.list(user.id, undefined, id)).length)
      return yield* Effect.fail(new SavingsNotFound({ id }));
    if (data.account_id && !(yield* repo.ownsAccount(user.id, data.account_id)))
      return yield* Effect.fail(invalid("Expected an owned account"));
    const row = yield* repo.update(user.id, id, data);
    if (!row) return yield* Effect.fail(new SavingsNotFound({ id }));
    return savingsDto(row);
  });
}
export function contributeSavings(rawId: unknown, raw: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const repo = yield* SavingsRepository;
    const id = yield* parse(z.uuid(), rawId);
    const data = yield* parse(
      z.strictObject({
        amount: positiveMoney,
        direction: z.enum(["deposit", "withdraw"]),
      }),
      raw,
    );
    if (!(yield* repo.list(user.id, undefined, id)).length)
      return yield* Effect.fail(new SavingsNotFound({ id }));
    const row = yield* repo.adjust(user.id, id, data.amount, data.direction);
    if (!row) {
      if (!(yield* repo.list(user.id, undefined, id)).length)
        return yield* Effect.fail(new SavingsNotFound({ id }));
      return yield* Effect.fail(
        invalid(
          "Contribution would exceed the supported range or available savings",
        ),
      );
    }
    return savingsDto(row);
  });
}
export function deleteSavings(rawId: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const repo = yield* SavingsRepository;
    const id = yield* parse(z.uuid(), rawId);
    if (!(yield* repo.delete(user.id, id)))
      return yield* Effect.fail(new SavingsNotFound({ id }));
    return { deleted: true };
  });
}
