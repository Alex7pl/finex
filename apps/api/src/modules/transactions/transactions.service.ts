import { TransactionNotFound } from "@finex/shared/transactions/transactions.errors.js";
import { CurrentUser } from "@/runtime/request-context.js";
import { Effect } from "effect";
import { TransactionRepository } from "./transactions.repository.js";
import { parseTransactionFilters, parseTransactionId } from "./transactions.validation.js";

export function getTransactions(raw: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const filters = yield* parseTransactionFilters(raw);
    const repository = yield* TransactionRepository;
    return yield* repository.list(user.id, filters);
  });
}

export function getTransactionById(raw: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const id = yield* parseTransactionId(raw);
    const repository = yield* TransactionRepository;
    const transaction = yield* repository.findById(user.id, id);
    if (!transaction) return yield* Effect.fail(new TransactionNotFound({ id }));
    return transaction;
  });
}
