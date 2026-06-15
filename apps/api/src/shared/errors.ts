import { Data } from "effect";

export class UnauthorizedError extends Data.TaggedError(
  "UnauthorizedError",
)<{}> {}

export class ForbiddenError extends Data.TaggedError("ForbiddenError")<{}> {}

export class DatabaseError extends Data.TaggedError("DatabaseError")<{
  message: string;
  cause?: unknown;
}> {}

export class TaskNotFoundError extends Data.TaggedError("TaskNotFoundError")<{
  taskId: string;
}> {}
