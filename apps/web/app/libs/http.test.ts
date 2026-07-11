import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, createHttp, decodeHttpErrorResponse, resolveApiUrl } from "./http.js";

test("decodes only the shared HTTP error envelope", () => {
  assert.deepEqual(
    decodeHttpErrorResponse({
      error: { code: "UnauthorizedError", requestId: "request-1" },
    }),
    { error: { code: "UnauthorizedError", requestId: "request-1" } },
  );
  assert.equal(decodeHttpErrorResponse({ error: { code: "UnauthorizedError" } }), null);
});

test("joins module paths beneath the configured API base pathname", () => {
  assert.equal(
    resolveApiUrl("/transactions", "https://example.com/api").href,
    "https://example.com/api/transactions",
  );
});

test("includes credentials on trusted API requests", async () => {
  let receivedInit: RequestInit | undefined;
  const http = createHttp({
    apiUrl: "https://api.example.com/api",
    fetchImpl: async (_input, init) => {
      receivedInit = init;
      return Response.json({ ok: true });
    },
  });

  await http("/transactions", { credentials: "omit" });

  assert.equal(receivedInit?.credentials, "include");
});

test("forwards the incoming Cookie header during SSR", async () => {
  let receivedHeaders: Headers | undefined;
  const http = createHttp({
    apiUrl: "https://api.example.com/api",
    isServer: true,
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
});

test("does not manually forward the incoming Cookie header in browser mode", async () => {
  let receivedHeaders: Headers | undefined;
  const http = createHttp({
    apiUrl: "https://api.example.com/api",
    isServer: false,
    fetchImpl: async (_input, init) => {
      receivedHeaders = new Headers(init?.headers);
      return Response.json({ ok: true });
    },
  });
  const request = new Request("https://web.example.com/transactions", {
    headers: { cookie: "accessToken=token-1" },
  });

  await http("/transactions", { request });

  assert.equal(receivedHeaders?.has("cookie"), false);
});

test("rejects an untrusted API origin before fetch without forwarding Cookie", async () => {
  let fetchCalls = 0;
  let receivedCookie: string | null = null;
  const http = createHttp({
    apiUrl: "https://api.example.com/api",
    isServer: true,
    fetchImpl: async (_input, init) => {
      fetchCalls += 1;
      receivedCookie = new Headers(init?.headers).get("cookie");
      return Response.json({ ok: true });
    },
  });
  const request = new Request("https://web.example.com/transactions", {
    headers: { cookie: "accessToken=token-1" },
  });

  await assert.rejects(http("https://evil.example/collect", { request }), {
    name: "ApiError",
    status: 400,
    code: "UntrustedApiOrigin",
  });
  assert.equal(fetchCalls, 0);
  assert.equal(receivedCookie, null);
});

test("preserves HTTP status when the error envelope is malformed", async () => {
  const http = createHttp({
    apiUrl: "https://example.com/api",
    fetchImpl: async () => new Response("private body", { status: 418 }),
  });

  await assert.rejects(http("/transactions"), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 418);
    assert.equal(error.code, "HttpError");
    assert.equal(error.message.includes("private body"), false);
    return true;
  });
});

test("normalizes network and malformed successful JSON failures", async () => {
  const networkHttp = createHttp({
    apiUrl: "https://example.com/api",
    fetchImpl: async () => {
      throw new TypeError("socket details");
    },
  });
  const malformedHttp = createHttp({
    apiUrl: "https://example.com/api",
    fetchImpl: async () => new Response("not json", { status: 200 }),
  });

  await assert.rejects(networkHttp("/transactions"), {
    name: "ApiError",
    status: 503,
    code: "NetworkError",
  });
  await assert.rejects(malformedHttp("/transactions"), {
    name: "ApiError",
    status: 502,
    code: "InvalidJsonResponse",
  });
});
