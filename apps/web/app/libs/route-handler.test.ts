import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "./http.js";
import { routeHandler } from "./route-handler.js";

test("redirects centralized 401 failures to login", async () => {
  const handler = routeHandler(async () => {
    throw new ApiError(401, "UnauthorizedError", "request-1");
  });

  await assert.rejects(handler(), (error: unknown) => {
    assert.ok(error instanceof Response);
    assert.equal(error.status, 302);
    assert.equal(error.headers.get("location"), "/login");
    return true;
  });
});

test("converts non-401 API failures into route errors", async () => {
  const handler = routeHandler(async () => {
    throw new ApiError(404, "UserNotFound", "request-2");
  });

  await assert.rejects(handler(), (error: unknown) => {
    if (
      typeof error !== "object" ||
      error === null ||
      !("data" in error) ||
      !("init" in error)
    ) {
      return false;
    }
    assert.deepEqual(error.init, { status: 404 });
    assert.deepEqual(error.data, {
      code: "UserNotFound",
      requestId: "request-2",
    });
    return true;
  });
});
