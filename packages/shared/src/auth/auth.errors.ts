import { Schema } from "effect";

export class UserNotFound extends Schema.TaggedError<UserNotFound>()(
  "UserNotFound",
  {
    message: Schema.String,
  },
) {}

export class UserAlreadyExists extends Schema.TaggedError<UserAlreadyExists>()(
  "UserAlreadyExists",
  { message: Schema.String },
) {}
