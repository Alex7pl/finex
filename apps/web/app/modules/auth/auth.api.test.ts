import assert from "node:assert/strict";
import test from "node:test";
import type { HttpOptions } from "@/libs/http.js";
import { createAuthApi } from "./auth.api.js";

function stubHttp(response: unknown) {
  const calls: Array<{ path: string; options: HttpOptions }> = [];
  const client = async <T>(path: string, options: HttpOptions = {}) => {
    calls.push({ path, options });
    return response as T;
  };
  return { calls, client };
}

test("login posts through the centralized client and decodes LoginResponse", async () => {
  const stub = stubHttp({ id: "user-1", email: "user@finex.app" });
  const api = createAuthApi(stub.client);
  const result = await api.login({ email: "user@finex.app", password: "secret" });

  assert.equal(result.id, "user-1");
  assert.deepEqual(stub.calls, [{
    path: "/auth/login",
    options: {
      method: "POST",
      body: { email: "user@finex.app", password: "secret" },
      request: undefined,
    },
  }]);
});

test("register rejects a successful response that violates the shared DTO", async () => {
  const stub = stubHttp({ id: "user-1", email: "user@finex.app" });
  const api = createAuthApi(stub.client);

  await assert.rejects(() => api.register({
    username: "Alex",
    email: "user@finex.app",
    password: "Finex2026",
  }));
});
