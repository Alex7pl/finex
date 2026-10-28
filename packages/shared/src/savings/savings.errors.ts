import { Schema } from "effect";
export class SavingsNotFound extends Schema.TaggedError<SavingsNotFound>()(
  "SavingsNotFound",
  { id: Schema.String },
) {}
