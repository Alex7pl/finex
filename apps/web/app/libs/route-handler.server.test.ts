import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "./api-error.js";
import {
  requireSameOrigin,
  routeAction,
  routeHandler,
} from "./route-handler.server.js";

test("redirects 401 failures and preserves session-clearing cookies", async () => {
  const headers = new Headers();
  headers.append("set-cookie", "accessToken=; Path=/");
  headers.append("set-cookie", "refreshToken=; Path=/");
  const handler = routeHandler(async () => {
    throw new ApiError(401, "UnauthorizedError", "request-1", headers);
  });

  await assert.rejects(handler(), (error: unknown) => {
    assert.ok(error instanceof Response);
    assert.equal(error.status, 302);
    assert.equal(error.headers.get("location"), "/");
    assert.equal(error.headers.has("set-cookie"), true);
    return true;
  });
});

test("converts non-401 API failures into route errors with headers", async () => {
  const headers = new Headers({ "x-test": "preserved" });
  const handler = routeHandler(async () => {
    throw new ApiError(404, "UserNotFound", "request-2", headers);
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
    const routeError = error as {
      data: unknown;
      init: { status: number; headers: Headers };
    };
    assert.equal(routeError.init.status, 404);
    assert.equal(routeError.init.headers.get("x-test"), "preserved");
    assert.deepEqual(routeError.data, {
      code: "UserNotFound",
      requestId: "request-2",
    });
    return true;
  });
});

test("requires an exact same-origin Origin or Referer for mutations", () => {
  assert.doesNotThrow(() =>
    requireSameOrigin(
      new Request("https://web.example.com/", {
        headers: { origin: "https://web.example.com" },
      }),
    ),
  );
  assert.doesNotThrow(() =>
    requireSameOrigin(
      new Request("https://web.example.com/", {
        headers: { referer: "https://web.example.com/login" },
      }),
    ),
  );
  const invalidHeaders: HeadersInit[] = [
    new Headers(),
    { origin: "https://evil.example" },
    { origin: "https://web.example.com/login" },
    { origin: "not-a-url" },
  ];
  for (const headers of invalidHeaders) {
    assert.throws(
      () =>
        requireSameOrigin(
          new Request("https://web.example.com/", { headers }),
        ),
      { status: 403, code: "InvalidRequestOrigin" },
    );
  }
});

test("routeAction validates provenance before running the mutation", async () => {
  let calls = 0;
  const action = routeAction(async ({ request }: { request: Request }) => {
    calls += 1;
    return request.method;
  });

  await assert.rejects(
    action({ request: new Request("https://web.example.com/") }),
  );
  assert.equal(calls, 0);
  assert.equal(
    await action({
      request: new Request("https://web.example.com/", {
        method: "POST",
        headers: { origin: "https://web.example.com" },
      }),
    }),
    "POST",
  );
  assert.equal(calls, 1);
});
