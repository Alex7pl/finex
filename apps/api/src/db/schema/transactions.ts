import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { idColumn, moneyColumn, timestampColumns } from "../helpers.js";
import { accounts } from "./accounts.js";
import { users } from "./users.js";

export const transactionsTypeEnum = pgEnum("transactions_type", [
  "Fixed_income",
  "Variable_income",
  "Fixed_expense",
  "Variable_expense",
  "Transfer",
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

    type: transactionsTypeEnum("type").notNull(),

    description: text("description"),

    amount: moneyColumn("amount").notNull(),

    from: uuid("from")
      .references(() => accounts.id, { onDelete: "restrict", onUpdate: "cascade" })
      .notNull(),

    //For fixed transactions
    cycle: timestamp("cycle", { withTimezone: true }).defaultNow(),
    is_active: boolean("is_active"),

    ...timestampColumns,
  },
  (table) => [
    index("transactions_user_id_idx").on(table.user_id),
    index("transactions_from_idx").on(table.from),
    check("transactions_amount_non_zero", sql`${table.amount} <> 0`),
  ],
);

export const transactions_splits = pgTable(
  "transactions_splits",
  {
    ...idColumn,

    transaction_id: uuid("transaction_id")
      .references(() => transactions.id, { onDelete: "cascade", onUpdate: "cascade" })
      .notNull(),
    account_id: uuid("account_id")
      .references(() => accounts.id, { onDelete: "restrict", onUpdate: "cascade" })
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
