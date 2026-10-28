import { Effect } from "effect";
import { z } from "zod";
import { CurrentUser } from "@/runtime/request-context.js";
import { SourceNotFound, type SourceKind } from "@finex/shared/ledger/ledger.schema.js";
import { TransactionRepository } from "../transactions/transactions.repository.js";
import { invalid, parse } from "../budgets/planning.validation.js";
import { LedgerRepository } from "./ledger.repository.js";
import { accrualInput, debtInput, debtPatch, incomeInput, incomePatch, movementInput, settlementInput } from "./ledger.validation.js";

export function listSources(kind: SourceKind, rawId?: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const repo = yield* LedgerRepository;
    const id = rawId === undefined ? undefined : yield* parse(z.uuid(), rawId);
    const rows = yield* repo.list(user.id, kind, id);
    if (id && !rows.length) return yield* Effect.fail(new SourceNotFound({ id }));
    return id ? rows[0]! : { items: rows };
  });
}
export function saveSource(kind: SourceKind, raw: unknown, rawId?: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const repo = yield* LedgerRepository;
    const id = rawId === undefined ? undefined : yield* parse(z.uuid(), rawId);
    const schema = kind === "debt" ? (id ? debtPatch : debtInput) : (id ? incomePatch : incomeInput);
    const input = yield* parse(schema, raw);
    const saved = yield* repo.save(user.id, kind, input, id);
    const rows = yield* repo.list(user.id, kind, saved);
    if (!rows[0]) return yield* Effect.fail(new SourceNotFound({ id: saved }));
    return rows[0];
  });
}
export function deleteSource(kind: SourceKind, rawId: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const id = yield* parse(z.uuid(), rawId);
    const repo = yield* LedgerRepository;
    yield* repo.delete(user.id, kind, id);
    return { deleted: true };
  });
}
export function createMovement(raw: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const data = yield* parse(movementInput, raw);
    const repo = yield* LedgerRepository;
    const id = yield* repo.createMovement(user.id, data);
    const transactions = yield* TransactionRepository;
    const movement = yield* transactions.findById(user.id, id);
    if (!movement) return yield* Effect.fail(invalid("Created movement could not be read"));
    return movement;
  });
}
export function accrueSource(kind: SourceKind, rawId: unknown, raw: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const id = yield* parse(z.uuid(), rawId);
    const data = yield* parse(accrualInput, raw);
    const repo = yield* LedgerRepository;
    const movementId = yield* repo.accrue(user.id, kind, id, data);
    const transactions = yield* TransactionRepository;
    return yield* transactions.findById(user.id, movementId);
  });
}
export function settleMovement(rawId: unknown, raw: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const id = yield* parse(z.uuid(), rawId);
    const data = yield* parse(settlementInput, raw);
    const repo = yield* LedgerRepository;
    yield* repo.settle(user.id, id, data.splits);
    const transactions = yield* TransactionRepository;
    return yield* transactions.findById(user.id, id);
  });
}
