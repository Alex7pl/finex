import { Schema } from "effect";

/** Public profile of the authenticated user. Credentials never cross this boundary. */
export const UserProfile = Schema.Struct({
  id: Schema.UUID,
  email: Schema.String,
  username: Schema.String,
  created_at: Schema.String,
  updated_at: Schema.String,
});
export type UserProfile = typeof UserProfile.Type;

export const UpdateUserProfileInput = Schema.Struct({
  username: Schema.optional(Schema.Trim.pipe(Schema.minLength(2), Schema.maxLength(40))),
  email: Schema.optional(Schema.Trim.pipe(
    Schema.maxLength(254),
    Schema.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
  )),
  // Required by the service only when the login email actually changes.
  current_password: Schema.optional(Schema.String.pipe(Schema.minLength(1), Schema.maxLength(1024))),
});
export type UpdateUserProfileInput = typeof UpdateUserProfileInput.Type;
