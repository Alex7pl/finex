import { Cause, Effect, Exit, Option } from "effect";
import type { Request, RequestHandler, Response, NextFunction } from "express";
import {
  UnauthorizedError,
  ValidationError,
  type HttpErrorResponse,
} from "@finex/shared/errors.js";
import { UserNotFound } from "@finex/shared/auth/auth.errors.js";
import type { AuthenticatedUser } from "../runtime/request-context.js";
import { DatabaseError } from "../shared/errors.js";
import { runPublic, runProtected, type RequestData } from "../runtime/run-request.js";

type AppError = UnauthorizedError | ValidationError | UserNotFound | DatabaseError;

const STATUS: Record<AppError["_tag"], number> = {
  UnauthorizedError: 401,
  ValidationError: 400,
  UserNotFound: 404,
  DatabaseError: 500,
};

function writeError(
  res: Response,
  next: NextFunction,
  cause: Cause.Cause<AppError>,
): void {
  const failureOption = Cause.failureOption(cause);

  if (Option.isSome(failureOption)) {
    const error = failureOption.value;
    const status = STATUS[error._tag];
    const body: HttpErrorResponse = {
      error: {
        code: error._tag,
        requestId: res.locals.requestId,
      },
    };
    res.status(status).json(body);
    return;
  }

  // Defect or unexpected failure — delegate to Express error handler
  next(Cause.squash(cause));
}

type HandlerCtx = {
  requestId: string;
  user: AuthenticatedUser | null;
  response: Response;
};

type RunFn = typeof runPublic | typeof runProtected;

type EffectHandler<A, E, R> = (
  req: Request,
  ctx: HandlerCtx,
) => Effect.Effect<A, E, R>;

export function makeHandler(run: RunFn) {
  return <A, E extends AppError, R>(
    handler: EffectHandler<A, E, R>,
  ): RequestHandler =>
    async (req: Request, res: Response, next: NextFunction) => {
      const ctx: HandlerCtx = {
        requestId: res.locals.requestId,
        user: res.locals.user,
        response: res,
      };

      const program = handler(req, ctx);
      // @ts-expect-error — R generics are resolved at call sites; runtime is correct
      const exit = await Effect.runPromiseExit(run(ctx, program));

      Exit.match(exit, {
        onSuccess: (value) => {
          res.json(value);
        },
        onFailure: (cause) => {
          writeError(res, next, cause as Cause.Cause<AppError>);
        },
      });
    };
}
