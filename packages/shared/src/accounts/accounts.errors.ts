import { Schema } from "effect";

export class AccountNotFound extends Schema.TaggedError<AccountNotFound>()(
  "AccountNotFound",
  {
    message: Schema.String,
  },
) {}
