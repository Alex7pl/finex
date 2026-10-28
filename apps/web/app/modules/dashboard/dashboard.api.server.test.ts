import assert from "node:assert/strict";
import test from "node:test";
import { ApiError } from "@/libs/api-error.js";
import type { ServerHttpClient } from "@/libs/http.server.js";
import {
  createDashboardApi,
  dashboardFilters,
} from "./dashboard.api.server.js";
import {
  accountId,
  dashboardFixture,
  transactionId,
} from "./dashboard.fixtures.test-support.js";
import { monthStart, dashboardHref } from "./dashboard-period.js";
import { cents, decimal, formatMoney } from "./dashboard-money.js";

const now = new Date("2026-10-19T12:00:00Z");
const request = (query = "") =>
  new Request(`https://web.example.com/dashboard${query}`, {
    headers: { cookie: "accessToken=old; refreshToken=refresh" },
  });
function apiClient(
  overrides: { invalidBudgets?: boolean; failSavings?: boolean } = {},
) {
  const paths: string[] = [];
  const cookies: string[] = [];
  const client = (async (path: string, options: { request: Request }) => {
    paths.push(path);
    cookies.push(options.request.headers.get("cookie") ?? "");
    const url = new URL(path, "https://api.example.com");
    const headers = new Headers();
    let value: unknown;
    if (url.pathname === "/users/me") {
      value = dashboardFixture.user;
      headers.append("set-cookie", "accessToken=renewed; Path=/; HttpOnly");
    } else if (url.pathname === "/accounts") value = dashboardFixture.accounts;
    else if (url.pathname === "/accounts/balance-history")
      value = dashboardFixture.balance;
    else if (url.pathname === "/transactions")
      value = dashboardFixture.transactions;
    else if (url.pathname === `/transactions/${transactionId}`)
      value = dashboardFixture.transactions.items[0];
    else if (url.pathname === "/budgets")
      value = overrides.invalidBudgets
        ? { items: [{ fake: true }] }
        : { items: dashboardFixture.budgets, month: "2026-10" };
    else if (url.pathname === "/savings") {
      if (overrides.failSavings)
        throw new ApiError(
          503,
          "DatabaseError",
          "request-failed",
          new Headers({
            "set-cookie": "refreshToken=rotated; Path=/; HttpOnly",
          }),
        );
      value = { items: dashboardFixture.goals };
    } else throw new Error(path);
    return { data: value, headers };
  }) as ServerHttpClient;
  return { client, paths, cookies };
}
test("dashboard BFF authenticates first, validates nullable DTOs, forwards rotated cookies and URL filters", async () => {
  const mock = apiClient();
  const result = await createDashboardApi(mock.client)(
    request(
      `?month=2026-10&accountId=${accountId}&search=Compra&page=2&transactionId=${transactionId}`,
    ),
    now,
  );
  assert.equal(mock.paths[0], "/users/me");
  assert.ok(
    mock.cookies
      .slice(1)
      .every(
        (cookie) =>
          cookie.includes("accessToken=renewed") &&
          cookie.includes("refreshToken=refresh"),
      ),
  );
  assert.equal(result.data.user.username, dashboardFixture.user.username);
  assert.equal(result.data.accounts[0].emoji, null);
  assert.equal(result.data.transaction?.id, transactionId);
  const transactions = new URL(
    mock.paths.find((path) => path.startsWith("/transactions?"))!,
    "https://api.example.com",
  );
  assert.equal(transactions.searchParams.get("search"), "Compra");
  assert.equal(transactions.searchParams.get("page"), "2");
  assert.equal(transactions.searchParams.get("accountId"), accountId);
  assert.equal(
    transactions.searchParams.get("dateFrom"),
    "2026-09-30T22:00:00.000Z",
  );
  assert.equal(
    transactions.searchParams.get("dateTo"),
    "2026-10-19T11:59:59.999Z",
  );
  assert.equal(
    mock.paths.filter((path) => path.startsWith("/accounts/balance-history"))
      .length,
    1,
  );
  assert.equal(result.headers.getSetCookie().length, 1);
  assert.equal(result.headers.get("cache-control"), "private, no-store");
});
test("year and week controls request genuine history instead of swapping static points", async () => {
  for (const range of ["week", "year"]) {
    const mock = apiClient();
    await createDashboardApi(mock.client)(request(`?range=${range}`), now);
    const histories = mock.paths.filter((path) =>
      path.startsWith("/accounts/balance-history"),
    );
    assert.equal(histories.length, 2);
    const chart = new URL(histories[1], "https://api.example.com");
    assert.equal(
      chart.searchParams.get("interval"),
      range === "year" ? "month" : "day",
    );
    assert.equal(
      chart.searchParams.get("dateFrom"),
      range === "year"
        ? "2025-10-31T23:00:00.000Z"
        : "2026-10-12T12:00:00.000Z",
    );
  }
});
test("widget failure preserves refreshed cookies and malformed DTOs fail instead of displaying mock/zero data", async () => {
  for (const options of [{ invalidBudgets: true }, { failSavings: true }]) {
    const mock = apiClient(options);
    await assert.rejects(
      createDashboardApi(mock.client)(request(), now),
      (error: unknown) => {
        assert.ok(error instanceof ApiError);
        assert.equal(error.status, options.invalidBudgets ? 502 : 503);
        assert.ok(
          error.headers
            .getSetCookie()
            .some((cookie) => cookie.startsWith("accessToken=renewed")),
        );
        if (options.failSavings)
          assert.ok(
            error.headers
              .getSetCookie()
              .some((cookie) => cookie.startsWith("refreshToken=rotated")),
          );
        return true;
      },
    );
  }
});
test("invalid filters fail before network and calendar boundaries respect Madrid DST", () => {
  for (const query of [
    "?month=bad",
    "?month=2026-13",
    "?month=2026-11",
    "?range=bad",
    "?page=0",
    "?accountId=bad",
  ])
    assert.throws(() => dashboardFilters(request(query), now), ApiError);
  assert.equal(monthStart("2026-10").toISOString(), "2026-09-30T22:00:00.000Z");
  assert.equal(
    monthStart("2026-10", 1).toISOString(),
    "2026-10-31T23:00:00.000Z",
  );
  assert.equal(monthStart("2026-03").toISOString(), "2026-02-28T23:00:00.000Z");
  assert.equal(
    monthStart("2026-03", 1).toISOString(),
    "2026-03-31T22:00:00.000Z",
  );
  assert.ok(
    dashboardHref(dashboardFixture.filters, { page: "2" }).includes("page=2"),
  );
});
test("displayed money retains exact cents including negatives and large consolidated balances", () => {
  assert.equal(decimal(cents("0.10") + cents("0.20")), "0.30");
  assert.equal(formatMoney("-0.05"), "−0,05 €");
  assert.equal(formatMoney("90071992547409.93"), "90.071.992.547.409,93 €");
});
