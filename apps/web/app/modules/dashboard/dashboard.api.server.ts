import { Schema } from "effect";
import { UserProfile } from "@finex/shared/users/users.schema.js";
import {
  UpdatedAccount,
  HistoryBalance,
} from "@finex/shared/accounts/accounts.schema.js";
import { BudgetList } from "@finex/shared/budgets/budgets.schema.js";
import { SavingsList } from "@finex/shared/savings/savings.schema.js";
import {
  TransactionDto,
  TransactionList,
} from "@finex/shared/transactions/transactions.schema.js";
import { ApiError } from "@/libs/api-error.js";
import {
  serverHttp,
  mergeResponseCookies,
  type ServerHttpClient,
} from "@/libs/http.server.js";
import { madridMonth, monthStart } from "./dashboard-period.js";
import type { DashboardData, DashboardFilters } from "./dashboard.types.js";

export function dashboardFilters(
  request: Request,
  now: Date,
): DashboardFilters {
  const params = new URL(request.url).searchParams;
  const month = params.get("month") ?? madridMonth(now);
  const range = params.get("range") ?? "month";
  const page = params.get("page") ?? "1";
  const search = (params.get("search") ?? "").trim();
  const accountId = params.get("accountId") ?? "";
  if (
    !/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month) ||
    month > madridMonth(now) ||
    !["week", "month", "year"].includes(range) ||
    !/^[1-9]\d*$/.test(page) ||
    Number(page) > 1_000_000 ||
    search.length > 200 ||
    (accountId && !Schema.is(Schema.UUID)(accountId))
  ) {
    throw new ApiError(400, "InvalidDashboardFilters");
  }
  return {
    month,
    range: range as DashboardFilters["range"],
    page: Number(page),
    search,
    accountId,
  };
}

export function createDashboardApi(client: ServerHttpClient) {
  return async (
    request: Request,
    now = new Date(),
  ): Promise<{ data: DashboardData; headers: Headers }> => {
    const filters = dashboardFilters(request, now);
    const headers = new Headers({ "Cache-Control": "private, no-store" });
    let forwarded = request;
    async function read<A, I>(path: string, schema: Schema.Schema<A, I>) {
      const result = await client<unknown>(path, { request: forwarded }).catch(
        (error: unknown) => {
          if (error instanceof ApiError) {
            for (const cookie of error.headers.getSetCookie())
              headers.append("set-cookie", cookie);
            throw new ApiError(
              error.status,
              error.code,
              error.requestId,
              headers,
            );
          }
          throw error;
        },
      );
      for (const cookie of result.headers.getSetCookie())
        headers.append("set-cookie", cookie);
      try {
        return Schema.decodeUnknownSync(schema)(result.data);
      } catch {
        throw new ApiError(502, "InvalidApiResponse", undefined, headers);
      }
    }
    try {
      // Authenticate here: parent and child loaders may run concurrently. Reuse refreshed
      // cookies for subsequent calls instead of sending an expired cookie to every endpoint.
      const user = await read("/users/me", UserProfile);
      const cookies = headers.getSetCookie();
      if (cookies.length) {
        const forwardedHeaders = new Headers(request.headers);
        forwardedHeaders.set(
          "cookie",
          mergeResponseCookies(request.headers.get("cookie") ?? "", cookies),
        );
        forwarded = new Request(request.url, { headers: forwardedHeaders });
      }
      const start = monthStart(filters.month);
      const end = new Date(
        Math.min(monthStart(filters.month, 1).getTime(), now.getTime()),
      );
      const chartStart =
        filters.range === "year"
          ? monthStart(filters.month, -11)
          : filters.range === "week"
            ? new Date(end.getTime() - 7 * 86400000)
            : start;
      const historyPath = (from: Date, interval: string) => {
        const params = new URLSearchParams({
          dateFrom: from.toISOString(),
          dateTo: end.toISOString(),
          interval,
        });
        if (filters.accountId) params.set("accountId", filters.accountId);
        return `/accounts/balance-history?${params}`;
      };
      const transactionParams = new URLSearchParams({
        dateFrom: start.toISOString(),
        dateTo: new Date(end.getTime() - 1).toISOString(),
        page: String(filters.page),
        limit: "10",
        sortOrder: "desc",
      });
      if (filters.search) transactionParams.set("search", filters.search);
      if (filters.accountId)
        transactionParams.set("accountId", filters.accountId);
      const scoped = new URLSearchParams();
      if (filters.accountId) scoped.set("accountId", filters.accountId);
      const budgetParams = new URLSearchParams(scoped);
      budgetParams.set("month", filters.month);
      const transactionId = new URL(request.url).searchParams.get(
        "transactionId",
      );
      if (transactionId && !Schema.is(Schema.UUID)(transactionId))
        throw new ApiError(400, "InvalidTransactionId");
      const monthlyPromise = read(historyPath(start, "day"), HistoryBalance);
      const calls = [
        read("/accounts", Schema.Array(UpdatedAccount)),
        monthlyPromise,
        filters.range === "month"
          ? monthlyPromise
          : read(
              historyPath(
                chartStart,
                filters.range === "year" ? "month" : "day",
              ),
              HistoryBalance,
            ),
        read(`/transactions?${transactionParams}`, TransactionList),
        read(`/budgets?${budgetParams}`, BudgetList),
        read(`/savings?${scoped}`, SavingsList),
        transactionId
          ? read(`/transactions/${transactionId}`, TransactionDto)
          : Promise.resolve(null),
      ] as const;
      const results = await Promise.allSettled(calls);
      const failed = results.find((result) => result.status === "rejected");
      if (failed?.status === "rejected") throw failed.reason;
      const [
        accounts,
        monthly,
        balance,
        transactions,
        budgets,
        savings,
        transaction,
      ] = await Promise.all(calls);
      return {
        data: {
          user,
          accounts: [...accounts],
          monthly,
          balance,
          transactions,
          budgets: budgets.items,
          goals: savings.items,
          transaction,
          filters,
          now: now.toISOString(),
        },
        headers,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        // Preserve cookies even if one widget fails after another refreshed the session.
        if (error.headers !== headers)
          for (const cookie of error.headers.getSetCookie())
            headers.append("set-cookie", cookie);
        throw new ApiError(error.status, error.code, error.requestId, headers);
      }
      throw error;
    }
  };
}
export const loadDashboard = createDashboardApi(serverHttp);
