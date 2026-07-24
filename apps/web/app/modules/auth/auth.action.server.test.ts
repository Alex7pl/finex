import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "@/libs/api-error.js";
import type { ServerHttpResult } from "@/libs/http.server.js";
import type {
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
} from "@finex/shared/auth/auth.schema.js";
import { createAuthAction } from "./auth.action.server.js";

function formRequest(fields: Record<string, string>): Request {
  return new Request("https://web.example.com/", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "https://web.example.com",
    },
    body: new URLSearchParams(fields),
  });
}

function authApi(overrides: {
  login?: (
    input: LoginInput,
    request: Request,
  ) => Promise<ServerHttpResult<LoginResponse>>;
  register?: (
    input: RegisterInput,
    request: Request,
  ) => Promise<ServerHttpResult<RegisterResponse>>;
} = {}) {
  return {
    login:
      overrides.login ??
      (async () => ({
        data: { id: "user-1", email: "user@finex.app" } as LoginResponse,
        headers: new Headers(),
      })),
    register:
      overrides.register ??
      (async () => ({
        data: {
          id: "user-1",
          email: "user@finex.app",
          username: "Alex",
        } as RegisterResponse,
        headers: new Headers(),
      })),
  };
}

test("normalizes login input and returns API cookies with success data", async () => {
  let received: LoginInput | undefined;
  const headers = new Headers();
  headers.append("set-cookie", "accessToken=access-1; Path=/; HttpOnly");
  const action = createAuthAction(
    authApi({
      login: async (input) => {
        received = input;
        return {
          data: { id: "user-1", email: input.email } as LoginResponse,
          headers,
        };
      },
    }),
  );

  const result = await action(
    formRequest({
      intent: "login",
      email: "  USER@FINEX.APP ",
      password: "secret",
    }),
  );

  assert.deepEqual(received, {
    email: "user@finex.app",
    password: "secret",
  });
  assert.deepEqual(result.data, { ok: true, intent: "login" });
  assert.equal(
    new Headers(result.init?.headers).get("set-cookie"),
    "accessToken=access-1; Path=/; HttpOnly",
  );
});

test("returns field errors without calling the API", async () => {
  let calls = 0;
  const action = createAuthAction(
    authApi({
      register: async () => {
        calls += 1;
        throw new Error("must not be called");
      },
    }),
  );

  const result = await action(
    formRequest({
      intent: "register",
      username: "A",
      email: "invalid",
      password: "weak",
      terms: "false",
    }),
  );

  assert.equal(calls, 0);
  assert.equal(result.data.ok, false);
  if (!result.data.ok && result.data.intent === "register") {
    assert.deepEqual(Object.keys(result.data.fieldErrors).sort(), [
      "email",
      "password",
      "terms",
      "username",
    ]);
  }
});

test("maps expected API errors to safe form feedback", async () => {
  const action = createAuthAction(
    authApi({
      login: async () => {
        throw new ApiError(404, "UserNotFound", "request-1");
      },
    }),
  );

  const result = await action(
    formRequest({
      intent: "login",
      email: "user@finex.app",
      password: "incorrect",
    }),
  );

  assert.deepEqual(result.data, {
    ok: false,
    intent: "login",
    fieldErrors: {},
    formError: "El correo o la contraseña no son correctos.",
  });
});
