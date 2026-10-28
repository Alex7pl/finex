import { Context, Effect } from "effect";
import type { DatabaseError } from "@/shared/errors.js";
import type { budgets } from "@/db/schema/budgets.js";
export type BudgetRow = typeof budgets.$inferSelect;
export type BudgetWrite = Pick<
  BudgetRow,
  "name" | "monthly_limit" | "category_id" | "about_type"
>;
export type BudgetSummary = BudgetRow & { spent: string; pending: string };
export class BudgetRepository extends Context.Tag("BudgetRepository")<
  BudgetRepository,
  {
    list: (
      user: string,
      month: string,
      accountId?: string,
      id?: string,
    ) => Effect.Effect<BudgetSummary[], DatabaseError>;
    create: (
      user: string,
      data: BudgetWrite,
    ) => Effect.Effect<BudgetRow, DatabaseError>;
    update: (
      user: string,
      id: string,
      data: Partial<BudgetWrite>,
    ) => Effect.Effect<BudgetRow | null, DatabaseError>;
    delete: (user: string, id: string) => Effect.Effect<boolean, DatabaseError>;
    ownsCategory: (
      user: string,
      id: string,
    ) => Effect.Effect<boolean, DatabaseError>;
    ownsAccount: (
      user: string,
      id: string,
    ) => Effect.Effect<boolean, DatabaseError>;
  }
>() {}
