import { Schema } from "effect";

export const CategoryKind = Schema.Literal("income", "expense");
const name = Schema.Trim.pipe(Schema.minLength(1), Schema.maxLength(100));
const emoji = Schema.String.pipe(Schema.maxLength(32));
const color = Schema.String.pipe(Schema.pattern(/^#[0-9a-fA-F]{6}$/));

export const CreateCategoryInput = Schema.Struct({
  name,
  kind: CategoryKind,
  emoji: Schema.optional(Schema.NullOr(emoji)),
  color: Schema.optional(Schema.NullOr(color)),
});

/** Kind is immutable because existing transactions and budgets depend on it. */
export const UpdateCategoryInput = Schema.Struct({
  name: Schema.optional(name),
  emoji: Schema.optional(Schema.NullOr(emoji)),
  color: Schema.optional(Schema.NullOr(color)),
});

export const CategoryDto = Schema.Struct({
  id: Schema.UUID,
  name: Schema.String,
  kind: CategoryKind,
  emoji: Schema.NullOr(Schema.String),
  color: Schema.NullOr(Schema.String),
  created_at: Schema.String,
  updated_at: Schema.String,
});

export type CategoryDto = typeof CategoryDto.Type;
export type CreateCategoryInput = typeof CreateCategoryInput.Type;
export type UpdateCategoryInput = typeof UpdateCategoryInput.Type;
