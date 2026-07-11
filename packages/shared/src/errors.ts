import { Schema } from "effect";

/** Stable error contract returned by the HTTP API. */
export const HttpErrorResponse = Schema.Struct({
  error: Schema.Struct({
    code: Schema.String,
    requestId: Schema.String,
  }),
});

export type HttpErrorResponse = typeof HttpErrorResponse.Type;

export class UnauthorizedError extends Schema.TaggedError<UnauthorizedError>()(
  "UnauthorizedError",
  {},
) {}

export class ValidationError extends Schema.TaggedError<ValidationError>()(
  "ValidationError",
  {
    message: Schema.String,
    issues: Schema.Array(
      Schema.Struct({
        path: Schema.Array(Schema.String),
        message: Schema.String,
      }),
    ),
  },
) {}
