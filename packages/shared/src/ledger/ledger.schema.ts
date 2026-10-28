import { Schema } from "effect";

/** Amounts are decimal strings; interest is a total monetary amount, not a rate. */
export const SourceDto = Schema.Struct({
  id: Schema.UUID,
  kind: Schema.Literal("debt", "income"),
  name: Schema.String,
  account_id: Schema.UUID,
  category_id: Schema.NullOr(Schema.UUID),
  amount: Schema.String,
  is_active: Schema.Boolean,
  capital: Schema.NullOr(Schema.String),
  interests: Schema.NullOr(Schema.String),
  time_limit: Schema.NullOr(Schema.String),
  accrued_amount: Schema.String,
  settled_amount: Schema.String,
  pending_amount: Schema.String,
  total_amount: Schema.NullOr(Schema.String),
  remaining_amount: Schema.NullOr(Schema.String),
  transaction_count: Schema.Number,
  created_at: Schema.String,
  updated_at: Schema.String,
});
export type SourceDto = typeof SourceDto.Type;
export type SourceKind = SourceDto["kind"];
export type SourceWrite = {
  name: string; account_id: string; category_id: string | null; amount: string;
  is_active: boolean; capital: string | null; interests: string | null; time_limit: string | null;
};
export type SplitWrite = { account_id: string; amount: string; state: "Pending" | "Completed" };
export type MovementWrite = {
  type: "income" | "expense"; amount: string; description: string | null;
  category_id: string | null; splits: readonly SplitWrite[];
};
export type AccrualWrite = {
  amount?: string; description?: string; splits?: readonly SplitWrite[];
};
export class SourceNotFound extends Schema.TaggedError<SourceNotFound>()("SourceNotFound", { id: Schema.String }) {}
