import { TransactionNotFound } from "@finex/shared/transactions/transactions.errors.js";
import { CurrentUser } from "@/runtime/request-context.js";
import { CategoryNotFound } from "@finex/shared/categories/categories.errors.js";
import { SetTransactionCategoryInput } from "@finex/shared/transactions/transactions.schema.js";
import { ValidationError } from "@finex/shared/errors.js";
import { CategoryRepository } from "../categories/categories.repository.js";
import { Effect, Schema } from "effect";
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

export function setTransactionCategory(rawId: unknown, raw: unknown) {
  return Effect.gen(function* () {
    const user = yield* CurrentUser;
    const id = yield* parseTransactionId(rawId);
    const input = yield* Schema.decodeUnknown(SetTransactionCategoryInput)(raw, { onExcessProperty: "error" }).pipe(
      Effect.mapError(() => new ValidationError({ message: "Invalid transaction category", issues: [] })),
    );
    const repository = yield* TransactionRepository;
    const transaction = yield* repository.findById(user.id, id);
    if (!transaction) return yield* Effect.fail(new TransactionNotFound({ id }));
    if (input.category_id !== null) {
      const categories = yield* CategoryRepository;
      const category = yield* categories.findById(user.id, input.category_id);
      if (!category) return yield* Effect.fail(new CategoryNotFound({ id: input.category_id }));
      if (category.kind !== transaction.kind) return yield* Effect.fail(new ValidationError({
        message: "Category kind must match transaction kind; transfers cannot have categories", issues: [],
      }));
    }
    const updated = yield* repository.setCategory(user.id, id, input.category_id);
    if (!updated) return yield* Effect.fail(new TransactionNotFound({ id }));
    return updated;
  });
}
