import { Effect } from "effect";
import { UnauthorizedError } from "@finex/shared/errors.js";
import { AppLayer } from "./app-layer.js";
import {
  makeAuthenticatedRequestLayer,
  makeRequestLayer,
} from "./request-layer.js";
import type { AuthenticatedUser } from "./request-context.js";

export type RequestData = {
  requestId: string;
  user: AuthenticatedUser | null;
};

export function runPublic<A, E, R>(
  data: RequestData,
  program: Effect.Effect<A, E, R>,
) {
  const requestLayer = makeRequestLayer({
    requestId: data.requestId,
    user: data.user,
  });

  return program.pipe(Effect.provide(AppLayer), Effect.provide(requestLayer));
}

export function runProtected<A, E, R>(
  data: RequestData,
  program: Effect.Effect<A, E, R>,
) {
  return Effect.gen(function* () {
    if (!data.user) {
      return yield* Effect.fail(new UnauthorizedError());
    }

    const requestLayer = makeAuthenticatedRequestLayer({
      requestId: data.requestId,
      user: data.user,
    });

    return yield* program.pipe(
      Effect.provide(AppLayer),
      Effect.provide(requestLayer),
    );
  });
}
