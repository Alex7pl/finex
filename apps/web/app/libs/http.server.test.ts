import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "./api-error.js";
import {
  createServerHttp,
  decodeHttpErrorResponse,
  mergeResponseCookies,
  resolveApiUrl,
} from "./http.server.js";

function setCookies(headers: Headers): string[] {
  const withCookies = headers as Headers & { getSetCookie?: () => string[] };
  if (typeof withCookies.getSetCookie === "function") {
    return withCookies.getSetCookie();
  }
  const value = headers.get("set-cookie");
  return value ? [value] : [];
}

function apiResponse(
  body: unknown,
  init: ResponseInit = {},
  cookies: string[] = [],
): Response {
  const headers = new Headers(init.headers);
  for (const cookie of cookies) headers.append("set-cookie", cookie);
  return Response.json(body, { ...init, headers });
}

test("decodes only the shared HTTP error envelope", () => {
  assert.deepEqual(
    decodeHttpErrorResponse({
      error: { code: "UnauthorizedError", requestId: "request-1" },
    }),
    { error: { code: "UnauthorizedError", requestId: "request-1" } },
  );
  assert.equal(
    decodeHttpErrorResponse({ error: { code: "UnauthorizedError" } }),
    null,
  );
});

test("joins module paths beneath the configured API base pathname", () => {
  assert.equal(
    resolveApiUrl("/transactions", "https://example.com/api").href,
    "https://example.com/api/transactions",
  );
});

test("merges rotated and deleted response cookies into an API Cookie header", () => {
  assert.equal(
    mergeResponseCookies(
      "accessToken=old-access; refreshToken=old-refresh; preference=compact",
      [
        "accessToken=new-access; Path=/; HttpOnly",
        "refreshToken=new-refresh; Path=/; HttpOnly",
      ],
    ),
    "accessToken=new-access; refreshToken=new-refresh; preference=compact",
  );
  assert.equal(
    mergeResponseCookies("accessToken=old; preference=compact", [
      "accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ]),
    "preference=compact",
  );
});

test("forwards Cookie and a trusted web Origin from the incoming request", async () => {
  let receivedHeaders: Headers | undefined;
  const http = createServerHttp({
    apiUrl: "https://api.example.com/api",
    fetchImpl: async (_input, init) => {
      receivedHeaders = new Headers(init?.headers);
      return Response.json({ ok: true });
    },
  });
  const request = new Request("https://web.example.com/transactions", {
    headers: { cookie: "accessToken=token-1; preference=compact" },
  });

  await http("/transactions", { request });

  assert.equal(
    receivedHeaders?.get("cookie"),
    "accessToken=token-1; preference=compact",
  );
  assert.equal(receivedHeaders?.get("origin"), "https://web.example.com");
});

test("rejects an untrusted API origin before forwarding credentials", async () => {
  let fetchCalls = 0;
  const http = createServerHttp({
    apiUrl: "https://api.example.com/api",
    fetchImpl: async () => {
      fetchCalls += 1;
      return Response.json({ ok: true });
    },
  });
  const request = new Request("https://web.example.com/transactions", {
    headers: { cookie: "accessToken=token-1" },
  });

  await assert.rejects(
    http("https://evil.example/collect", { request }),
    { name: "ApiError", status: 400, code: "UntrustedApiOrigin" },
  );
  assert.equal(fetchCalls, 0);
});

test("returns API Set-Cookie headers to the React Router action", async () => {
  const http = createServerHttp({
    apiUrl: "https://api.example.com",
    fetchImpl: async () =>
      apiResponse(
        { id: "user-1" },
        {},
        [
          "accessToken=access-1; Path=/; HttpOnly; SameSite=Lax",
          "refreshToken=refresh-1; Path=/; HttpOnly; SameSite=Lax",
        ],
      ),
  });

  const result = await http<{ id: string }>("/auth/login", {
    method: "POST",
    body: { email: "user@finex.app", password: "secret" },
    request: new Request("https://web.example.com/", {
      headers: { origin: "https://web.example.com" },
    }),
  });

  assert.equal(result.data.id, "user-1");
  assert.deepEqual(setCookies(result.headers), [
    "accessToken=access-1; Path=/; HttpOnly; SameSite=Lax",
    "refreshToken=refresh-1; Path=/; HttpOnly; SameSite=Lax",
  ]);
});

test("refreshes on the server, retries with rotated cookies, and propagates them", async () => {
  const paths: string[] = [];
  let retriedCookie: string | null = null;
  const http = createServerHttp({
    apiUrl: "https://api.example.com/api",
    fetchImpl: async (input, init) => {
      const path = new URL(input.toString()).pathname;
      paths.push(path);
      const headers = new Headers(init?.headers);

      if (path.endsWith("/auth/refresh")) {
        return apiResponse(
          { success: true },
          {},
          [
            "accessToken=new-access; Path=/; HttpOnly",
            "refreshToken=new-refresh; Path=/; HttpOnly",
          ],
        );
      }
      if (paths.length === 1) {
        return apiResponse(
          { error: { code: "UnauthorizedError", requestId: "request-1" } },
          { status: 401 },
        );
      }

      retriedCookie = headers.get("cookie");
      return Response.json({ value: 42 });
    },
  });
  const request = new Request("https://web.example.com/app", {
    headers: {
      cookie: "accessToken=old-access; refreshToken=old-refresh",
    },
  });

  const result = await http<{ value: number }>("/transactions", { request });

  assert.equal(result.data.value, 42);
  assert.equal(
    retriedCookie,
    "accessToken=new-access; refreshToken=new-refresh",
  );
  assert.deepEqual(paths, [
    "/api/transactions",
    "/api/auth/refresh",
    "/api/transactions",
  ]);
  assert.deepEqual(setCookies(result.headers), [
    "accessToken=new-access; Path=/; HttpOnly",
    "refreshToken=new-refresh; Path=/; HttpOnly",
  ]);
});

test("propagates cookie deletion when refresh fails", async () => {
  const http = createServerHttp({
    apiUrl: "https://api.example.com",
    fetchImpl: async (input) => {
      const path = new URL(input.toString()).pathname;
      if (path.endsWith("/auth/refresh")) {
        return apiResponse(
          { error: { code: "UnauthorizedError", requestId: "refresh-1" } },
          { status: 401 },
          [
            "accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
            "refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
          ],
        );
      }
      return apiResponse(
        { error: { code: "UnauthorizedError", requestId: "request-1" } },
        { status: 401 },
      );
    },
  });

  await assert.rejects(
    http("/transactions", {
      request: new Request("https://web.example.com/app", {
        headers: { cookie: "refreshToken=expired" },
      }),
    }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 401);
      assert.deepEqual(setCookies(error.headers), [
        "accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
        "refreshToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
      ]);
      return true;
    },
  );
});

test("shares one in-flight refresh for concurrent requests using the same token", async () => {
  let refreshCalls = 0;
  const http = createServerHttp({
    apiUrl: "https://api.example.com",
    fetchImpl: async (input, init) => {
      const path = new URL(input.toString()).pathname;
      const cookie = new Headers(init?.headers).get("cookie") ?? "";
      if (path.endsWith("/auth/refresh")) {
        refreshCalls += 1;
        await new Promise((resolve) => setTimeout(resolve, 10));
        return apiResponse(
          { success: true },
          {},
          [
            "accessToken=new-access; Path=/; HttpOnly",
            "refreshToken=new-refresh; Path=/; HttpOnly",
          ],
        );
      }
      return cookie.includes("accessToken=new-access")
        ? Response.json({ ok: true })
        : apiResponse(
            { error: { code: "UnauthorizedError", requestId: "request-1" } },
            { status: 401 },
          );
    },
  });
  const request = new Request("https://web.example.com/app", {
    headers: { cookie: "refreshToken=same-refresh" },
  });

  await Promise.all([
    http("/accounts", { request }),
    http("/transactions", { request }),
  ]);

  assert.equal(refreshCalls, 1);
});

test("normalizes network, HTTP, and malformed successful JSON failures", async () => {
  const request = new Request("https://web.example.com/app");
  const networkHttp = createServerHttp({
    apiUrl: "https://example.com",
    fetchImpl: async () => {
      throw new TypeError("private socket details");
    },
  });
  const httpError = createServerHttp({
    apiUrl: "https://example.com",
    fetchImpl: async () => new Response("private body", { status: 418 }),
  });
  const malformedHttp = createServerHttp({
    apiUrl: "https://example.com",
    fetchImpl: async () => new Response("not json", { status: 200 }),
  });

  await assert.rejects(networkHttp("/transactions", { request }), {
    status: 503,
    code: "NetworkError",
  });
  await assert.rejects(httpError("/transactions", { request }), {
    status: 418,
    code: "HttpError",
  });
  await assert.rejects(malformedHttp("/transactions", { request }), {
    status: 502,
    code: "InvalidJsonResponse",
  });
});
