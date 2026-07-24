import { data, redirect } from "react-router";
import { ApiError } from "./api-error.js";

interface RouteErrorData {
  code: string;
  requestId?: string;
}

function requestOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).origin === origin ? origin : null;
    } catch {
      return null;
    }
  }

  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

export function requireSameOrigin(request: Request): void {
  if (requestOrigin(request) !== new URL(request.url).origin) {
    throw new ApiError(403, "InvalidRequestOrigin");
  }
}

export function routeHandler<Args extends unknown[], Result>(
  handler: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;

      if (error.status === 401) {
        throw redirect("/", { headers: error.headers });
      }

      throw data<RouteErrorData>(
        { code: error.code, requestId: error.requestId },
        { status: error.status, headers: error.headers },
      );
    }
  };
}

export function routeAction<Args extends { request: Request }, Result>(
  handler: (args: Args) => Promise<Result>,
): (args: Args) => Promise<Result> {
  return routeHandler(async (args: Args) => {
    requireSameOrigin(args.request);
    return handler(args);
  });
}
