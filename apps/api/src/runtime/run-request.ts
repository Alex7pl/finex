import { Effect } from "effect";
import { RpcContext } from "../rpc/context.js";
import { UnauthorizedError } from "../shared/errors.js";
import { AppLayer } from "./app-layer.js";
import {
  makeAuthenticatedRequestLayer,
  makeRequestLayer,
} from "./request-layer.js";

export function runPublic<A, E, R>(
  ctx: RpcContext,
  program: Effect.Effect<A, E, R>,
) {
  const requestLayer = makeRequestLayer({
    requestId: ctx.requestId,
    user: ctx.user,
  });

  return program.pipe(Effect.provide(AppLayer), Effect.provide(requestLayer));
}

export function runProtected<A, E, R>(
  ctx: RpcContext,
  program: Effect.Effect<A, E, R>,
) {
  return Effect.gen(function* () {
    if (!ctx.user) {
      return yield* Effect.fail(new UnauthorizedError());
    }

    const requestLayer = makeAuthenticatedRequestLayer({
      requestId: ctx.requestId,
      user: ctx.user,
    });

    return yield* program.pipe(
      Effect.provide(AppLayer),
      Effect.provide(requestLayer),
    );
  });
}
