import {
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryKind,
} from "@finex/shared/categories/categories.schema.js";
import { CategoryNotFound } from "@finex/shared/categories/categories.errors.js";
import { ValidationError } from "@finex/shared/errors.js";
import { CurrentUser } from "@/runtime/request-context.js";
import { Effect, Schema } from "effect";
import { CategoryRepository } from "./categories.repository.js";

const invalid = () => new ValidationError({
  message: "Invalid category input",
  issues: [],
});

const decode = <A, I>(schema: Schema.Schema<A, I>, raw: unknown) =>
  Schema.decodeUnknown(schema)(raw, { onExcessProperty: "error" }).pipe(
    Effect.mapError(invalid),
  );

export const parseCategoryId = (raw: unknown) => decode(Schema.UUID, raw);

export function getCategories(raw: unknown) {
  return Effect.gen(function* () {
    const query = yield* decode(Schema.Struct({ kind: Schema.optional(CategoryKind) }), raw);
    const user = yield* CurrentUser;
    const repository = yield* CategoryRepository;
    return yield* repository.list(user.id, query.kind);
  });
}

export function getCategoryById(raw: unknown) {
  return Effect.gen(function* () {
    const id = yield* parseCategoryId(raw);
    const user = yield* CurrentUser;
    const repository = yield* CategoryRepository;
    const row = yield* repository.findById(user.id, id);
    if (!row) return yield* Effect.fail(new CategoryNotFound({ id }));
    return row;
  });
}

export function createCategory(raw: unknown) {
  return Effect.gen(function* () {
    const input = yield* decode(CreateCategoryInput, raw);
    const user = yield* CurrentUser;
    const repository = yield* CategoryRepository;
    return yield* repository.create(user.id, input);
  });
}

export function updateCategory(rawId: unknown, raw: unknown) {
  return Effect.gen(function* () {
    const id = yield* parseCategoryId(rawId);
    const input = yield* decode(UpdateCategoryInput, raw);
    if (!Object.values(input).some((value) => value !== undefined)) {
      return yield* Effect.fail(invalid());
    }
    const user = yield* CurrentUser;
    const repository = yield* CategoryRepository;
    const row = yield* repository.update(user.id, id, input);
    if (!row) return yield* Effect.fail(new CategoryNotFound({ id }));
    return row;
  });
}

export function deleteCategory(raw: unknown) {
  return Effect.gen(function* () {
    const id = yield* parseCategoryId(raw);
    const user = yield* CurrentUser;
    const repository = yield* CategoryRepository;
    if (!(yield* repository.remove(user.id, id))) {
      return yield* Effect.fail(new CategoryNotFound({ id }));
    }
    return { deleted: true };
  });
}
