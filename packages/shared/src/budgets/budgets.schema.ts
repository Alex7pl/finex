import { Schema } from "effect";
const PositiveMoney = Schema.String.pipe(
  Schema.pattern(/^(?:[1-9]\d{0,9}(?:\.\d{1,2})?|0\.(?:0[1-9]|[1-9]\d?))$/),
);
const Name = Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200));
export const CreateBudgetInput = Schema.Struct({
  name: Name,
  monthly_limit: PositiveMoney,
  category_id: Schema.optional(Schema.NullOr(Schema.UUID)),
  about_type: Schema.optional(
    Schema.NullOr(Schema.Literal("expense")),
  ),
});
export const UpdateBudgetInput = Schema.partial(CreateBudgetInput);
export const BudgetDto = Schema.Struct({
  id: Schema.UUID,
  name: Schema.NullOr(Schema.String),
  monthly_limit: Schema.String,
  category_id: Schema.NullOr(Schema.UUID),
  about_type: Schema.NullOr(Schema.String),
  month: Schema.String,
  spent: Schema.String,
  pending: Schema.String,
  remaining: Schema.String,
  exceeded: Schema.String,
  progress_percent: Schema.Number,
  created_at: Schema.String,
  updated_at: Schema.String,
});
export type BudgetDto = typeof BudgetDto.Type;

export const BudgetList = Schema.Struct({
  items: Schema.Array(BudgetDto),
  month: Schema.String,
});
export type BudgetList = typeof BudgetList.Type;
