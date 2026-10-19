import { Schema } from "effect";

export class TransactionNotFound extends Schema.TaggedError<TransactionNotFound>()(
  "TransactionNotFound", { id: Schema.String },
) {}
