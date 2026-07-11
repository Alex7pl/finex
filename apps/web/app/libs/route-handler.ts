import { data, redirect } from "react-router";
import { ApiError } from "./http.js";

interface RouteErrorData {
  code: string;
  requestId?: string;
}

export function routeHandler<Args extends unknown[], Result>(
  handler: (...args: Args) => Promise<Result>,
): (...args: Args) => Promise<Result> {
  return async (...args) => {
    try {
      return await handler(...args);
    } catch (error) {
      if (!(error instanceof ApiError)) throw error;

      if (error.status === 401) throw redirect("/login");

      throw data<RouteErrorData>(
        { code: error.code, requestId: error.requestId },
        { status: error.status },
      );
    }
  };
}
