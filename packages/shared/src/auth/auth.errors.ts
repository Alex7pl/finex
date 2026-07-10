import { Schema } from "effect";

export class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  "UserNotFound",
  {
    message: Schema.String,
  },
) {}
