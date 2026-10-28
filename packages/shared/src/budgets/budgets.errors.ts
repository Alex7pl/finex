import { Schema } from "effect";
export class BudgetNotFound extends Schema.TaggedError<BudgetNotFound>()(
  "BudgetNotFound",
  { id: Schema.String },
) {}
