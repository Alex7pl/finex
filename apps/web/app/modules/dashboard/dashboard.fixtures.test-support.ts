import type { DashboardData } from "./dashboard.types.js";

export const accountId = "00000000-0000-4000-8000-000000000010";
export const destinationId = "00000000-0000-4000-8000-000000000011";
export const transactionId = "00000000-0000-4000-8000-000000000020";
export const dashboardFixture: DashboardData = {
  user: {
    id: "00000000-0000-4000-8000-000000000001",
    username: "Usuario de prueba",
    email: "user@example.com",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-10-19T12:00:00Z",
  },
  accounts: [
    {
      id: accountId,
      name: "Mi cuenta real",
      emoji: null,
      color: null,
      annual_interest_rate: null,
      interest_payment_rate: null,
      balance: "150.25",
    },
  ],
  balance: {
    currency: "EUR",
    total_balance: "150.25",
    initial_balance: "100.00",
    last_period_balance: "10.00",
    income: "90.25",
    expenses: "40.00",
    history: [
      { date: "2026-10-19", change: "50.25", acumulated_balance: "150.25" },
    ],
  },
  monthly: {
    currency: "EUR",
    total_balance: "150.25",
    initial_balance: "100.00",
    last_period_balance: "10.00",
    income: "90.25",
    expenses: "40.00",
    history: [],
  },
  budgets: [
    {
      id: "00000000-0000-4000-8000-000000000030",
      name: "Comida real",
      monthly_limit: "100.00",
      category_id: null,
      about_type: null,
      month: "2026-10",
      spent: "40.00",
      pending: "10.00",
      remaining: "60.00",
      exceeded: "0.00",
      progress_percent: 40,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
  goals: [
    {
      id: "00000000-0000-4000-8000-000000000040",
      name: "Mi viaje real",
      account_id: accountId,
      current_amount: "50.00",
      target_amount: "200.00",
      remaining: "150.00",
      progress_percent: 25,
      completed: false,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    },
  ],
  transactions: {
    items: [
      {
        id: transactionId,
        type: "Transfer",
        kind: "transfer",
        description: "Transferencia real",
        amount: "60.00",
        category_id: null,
        category: null,
        created_at: "2026-10-19T10:00:00Z",
        updated_at: "2026-10-19T10:00:00Z",
        cycle: null,
        is_active: null,
        state: "Completed",
        is_internal_transfer: true,
        from_account: {
          id: accountId,
          name: "Mi cuenta real",
          emoji: null,
          color: null,
        },
        splits: [
          {
            id: "00000000-0000-4000-8000-000000000021",
            account: {
              id: destinationId,
              name: "Destino real",
              emoji: null,
              color: null,
            },
            amount: "60.00",
            state: "Completed",
          },
        ],
      },
    ],
    total: 12,
    page: 1,
    limit: 10,
    has_more: true,
  },
  transaction: null,
  filters: {
    month: "2026-10",
    range: "month",
    page: 1,
    accountId: "",
    search: "",
  },
  now: "2026-10-19T12:00:00Z",
};
