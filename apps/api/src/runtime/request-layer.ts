import { Layer } from "effect";
import {
  AuthenticatedUser,
  CurrentUser,
  RequestContext,
} from "./request-context.js";

export function makeRequestLayer(input: {
  requestId: string;
  user: AuthenticatedUser | null;
}) {
  return Layer.succeed(RequestContext, {
    requestId: input.requestId,
    user: input.user,
  });
}

export function makeAuthenticatedRequestLayer(input: {
  requestId: string;
  user: AuthenticatedUser;
}) {
  return Layer.mergeAll(
    Layer.succeed(RequestContext, {
      requestId: input.requestId,
      user: input.user,
    }),

    Layer.succeed(CurrentUser, input.user),
  );
}
