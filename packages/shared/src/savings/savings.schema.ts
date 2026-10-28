import { Schema } from "effect";
const PositiveMoney = Schema.String.pipe(
  Schema.pattern(/^(?:[1-9]\d{0,9}(?:\.\d{1,2})?|0\.(?:0[1-9]|[1-9]\d?))$/),
);
const Name = Schema.String.pipe(Schema.minLength(1), Schema.maxLength(200));
export const CreateSavingsInput = Schema.Struct({
  name: Name,
  account_id: Schema.UUID,
  target_amount: PositiveMoney,
  current_amount: Schema.optional(
    Schema.String.pipe(Schema.pattern(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/)),
  ),
});
export const UpdateSavingsInput = Schema.Struct({
  name: Schema.optional(Name),
  account_id: Schema.optional(Schema.UUID),
  target_amount: Schema.optional(PositiveMoney),
});
export const SavingsContributionInput = Schema.Struct({
  amount: PositiveMoney,
  direction: Schema.Literal("deposit", "withdraw"),
});
export const SavingsDto = Schema.Struct({
  id: Schema.UUID,
  name: Schema.NullOr(Schema.String),
  account_id: Schema.UUID,
  target_amount: Schema.String,
  current_amount: Schema.String,
  remaining: Schema.String,
  progress_percent: Schema.Number,
  completed: Schema.Boolean,
  created_at: Schema.String,
  updated_at: Schema.String,
});
export type SavingsDto = typeof SavingsDto.Type;

export const SavingsList = Schema.Struct({ items: Schema.Array(SavingsDto) });
export type SavingsList = typeof SavingsList.Type;
