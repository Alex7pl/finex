import assert from "node:assert/strict";
import test from "node:test";
import type {
  ServerHttpClient,
  ServerHttpOptions,
} from "@/libs/http.server.js";
import { createAuthApi } from "./auth.api.server.js";

function stubHttp(response: unknown) {
  const calls: Array<{ path: string; options: ServerHttpOptions }> = [];
  const client: ServerHttpClient = async <T>(
    path: string,
    options: ServerHttpOptions,
  ) => {
    calls.push({ path, options });
    return { data: response as T, headers: new Headers() };
  };
  return { calls, client };
}

test("login posts through the server client and decodes LoginResponse", async () => {
  const stub = stubHttp({ id: "user-1", email: "user@finex.app" });
  const api = createAuthApi(stub.client);
  const request = new Request("https://web.example.com/");
  const result = await api.login(
    { email: "user@finex.app", password: "secret" },
    request,
  );

  assert.equal(result.data.id, "user-1");
  assert.deepEqual(stub.calls, [
    {
      path: "/auth/login",
      options: {
        method: "POST",
        body: { email: "user@finex.app", password: "secret" },
        request,
      },
    },
  ]);
});

test("register rejects an API response that violates the shared DTO", async () => {
  const stub = stubHttp({ id: "user-1", email: "user@finex.app" });
  const api = createAuthApi(stub.client);

  await assert.rejects(
    () =>
      api.register(
        {
          username: "Alex",
          email: "user@finex.app",
          password: "Finex2026",
        },
        new Request("https://web.example.com/"),
      ),
    { status: 502, code: "InvalidApiResponse" },
  );
});
