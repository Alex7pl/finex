import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { idColumn, moneyColumn, timestampColumns } from "../helpers.js";
import { accounts } from "./accounts.js";
import { categories } from "./categories.js";
import { debts } from "./debts.js";
import { incomes } from "./incomes.js";
import { users } from "./users.js";

export const transactionsTypeEnum = pgEnum("transactions_type", [
  "income",
  "expense",
  "transfer",
]);

export const transactionsSplitsStateEnum = pgEnum("state", [
  "Completed",
  "Pending",
]);

export const transactions = pgTable(
  "transactions",
  {
    ...idColumn,
    user_id: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" })
      .notNull(),

    category_id: uuid("category_id").references(() => categories.id, { onDelete: "set null", onUpdate: "cascade" }),

    type: transactionsTypeEnum("type").notNull(),

    description: text("description"),

    amount: moneyColumn("amount").notNull(),

    from: uuid("from").references(() => accounts.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),

    debt_id: uuid("debt_id").references(() => debts.id, { onDelete: "set null", onUpdate: "cascade" }),
    income_id: uuid("income_id").references(() => incomes.id, { onDelete: "set null", onUpdate: "cascade" }),

    ...timestampColumns,
  },
  (table) => [
    index("transactions_user_id_idx").on(table.user_id),
    index("transactions_category_id_idx").on(table.category_id),
    index("transactions_from_idx").on(table.from),
    index("transactions_debt_id_idx").on(table.debt_id),
    index("transactions_income_id_idx").on(table.income_id),
    check("transactions_source_matches_type", sql`(${table.debt_id} IS NULL OR (${table.type} = 'expense' AND ${table.income_id} IS NULL)) AND (${table.income_id} IS NULL OR (${table.type} = 'income' AND ${table.debt_id} IS NULL))`),
    check("transactions_transfer_no_category", sql`${table.type} <> 'transfer' OR ${table.category_id} IS NULL`),
    check("transactions_amount_non_zero", sql`${table.amount} <> 0`),
  ],
);

export const transactions_splits = pgTable(
  "transactions_splits",
  {
    ...idColumn,

    transaction_id: uuid("transaction_id")
      .references(() => transactions.id, {
        onDelete: "cascade",
        onUpdate: "cascade",
      })
      .notNull(),
    account_id: uuid("account_id")
      .references(() => accounts.id, {
        onDelete: "restrict",
        onUpdate: "cascade",
      })
      .notNull(),

    amount: moneyColumn("amount").notNull(),

    state: transactionsSplitsStateEnum("state").notNull().default("Pending"),
  },
  (table) => [
    index("transactions_splits_transaction_id_idx").on(table.transaction_id),
    index("transactions_splits_account_id_idx").on(table.account_id),
    check("transactions_splits_amount_non_zero", sql`${table.amount} <> 0`),
  ],
);
