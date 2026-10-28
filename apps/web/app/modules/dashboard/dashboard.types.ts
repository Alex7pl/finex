import type { UserProfile } from "@finex/shared/users/users.schema.js";
import type {
  UpdatedAccount,
  HistoryBalance,
} from "@finex/shared/accounts/accounts.schema.js";
import type { BudgetDto } from "@finex/shared/budgets/budgets.schema.js";
import type { SavingsDto } from "@finex/shared/savings/savings.schema.js";
import type {
  TransactionDto,
  TransactionList,
} from "@finex/shared/transactions/transactions.schema.js";

export type DashboardRange = "week" | "month" | "year";
export interface DashboardFilters {
  month: string;
  range: DashboardRange;
  search: string;
  accountId: string;
  page: number;
}
export interface DashboardData {
  user: UserProfile;
  accounts: UpdatedAccount[];
  balance: HistoryBalance;
  monthly: HistoryBalance;
  budgets: readonly BudgetDto[];
  goals: readonly SavingsDto[];
  transactions: TransactionList;
  transaction: TransactionDto | null;
  filters: DashboardFilters;
  now: string;
}
export interface DashboardWidgetProps {
  dashboard: DashboardData;
}
export type ProfileActionData = { ok: true } | { ok: false; message: string };
