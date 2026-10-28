import assert from "node:assert/strict";
import test from "node:test";
import type { ServerHttpClient } from "@/libs/http.server.js";
import { ApiError } from "@/libs/api-error.js";
import { createUsersApi } from "./users.api.server.js";
import { createUpdateProfileAction } from "./users.action.server.js";
import { routeAction } from "@/libs/route-handler.server.js";
import { dashboardFixture } from "../dashboard/dashboard.fixtures.test-support.js";

test("profile BFF forwards update and preserves access cookie; rejects invalid response", async () => {
  const headers = new Headers({
    "set-cookie": "accessToken=updated; HttpOnly; Path=/",
  });
  const request = new Request("https://web.example.com/dashboard", {
    headers: { cookie: "session=incoming" },
  });
  const client = (async (path, options) => {
    assert.equal(path, "/users/me");
    assert.equal(options.request, request);
    assert.equal(options.method, "PATCH");
    assert.deepEqual(options.body, { username: "Updated" });
    return { data: dashboardFixture.user, headers };
  }) as ServerHttpClient;
  const result = await createUsersApi(client).updateProfile(request, {
    username: "Updated",
  });
  assert.equal(result.data.email, dashboardFixture.user.email);
  assert.equal(result.headers, headers);
  const invalid = (async () => ({
    data: { password: "private" },
    headers,
  })) as ServerHttpClient;
  await assert.rejects(
    createUsersApi(invalid).updateProfile(request, { username: "Updated" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 502);
      assert.equal(error.headers, headers);
      return true;
    },
  );
});
test("profile form action handles validation, conflicts and cookies without echoing credentials", async () => {
  const makeRequest = (
    fields: Record<string, string>,
    origin = "https://web.example.com",
  ) =>
    new Request("https://web.example.com/dashboard", {
      method: "POST",
      headers: { origin },
      body: new URLSearchParams({ intent: "update-profile", ...fields }),
    });
  let calls = 0;
  const action = createUpdateProfileAction({
    updateProfile: async (_request, input) => {
      calls++;
      assert.equal(input.username, "New name");
      return {
        data: dashboardFixture.user,
        headers: new Headers({ "set-cookie": "accessToken=updated; Path=/" }),
      };
    },
  });
  const invalid = await action(makeRequest({ username: " ", email: "bad" }));
  assert.equal(invalid.init?.status, 400);
  assert.equal(calls, 0);
  const success = await action(
    makeRequest({ username: " New name ", email: "user@example.com" }),
  );
  assert.equal(success.data.ok, true);
  assert.equal(new Headers(success.init?.headers).getSetCookie().length, 1);
  for (const status of [400, 401, 409]) {
    const failing = createUpdateProfileAction({
      updateProfile: async () => {
        throw new ApiError(
          status,
          "private",
          "request",
          new Headers({ "set-cookie": "accessToken=refreshed; Path=/" }),
        );
      },
    });
    const result = await failing(
      makeRequest({
        username: "New name",
        email: "user@example.com",
        current_password: "private-password",
      }),
    );
    assert.equal(result.data.ok, false);
    assert.ok(!JSON.stringify(result.data).includes("private-password"));
    assert.equal(new Headers(result.init?.headers).getSetCookie().length, 1);
  }
  const protectedAction = routeAction(({ request }: { request: Request }) =>
    action(request),
  );
  await assert.rejects(
    protectedAction({
      request: makeRequest(
        { username: "New name", email: "user@example.com" },
        "https://evil.example",
      ),
    }),
  );
  assert.equal(calls, 1);
});
