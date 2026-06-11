import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { idColumn, numberHelper, timestampColumns } from "../helpers.js";
import { accounts } from "./accounts.js";
import { users } from "./users.js";

export const transactionsTypeEnum = pgEnum("transactions_type", [
  "Fixed_income",
  "Variable_income",
  "Fixed_expense",
  "Variable_expense",
  "Transfer",
]);

const transactionsSplitsStateEnum = pgEnum("state", ["Completed", "Pending"]);

export const transactions = pgTable("transactions", {
  ...idColumn,
  user_id: uuid("user_id")
    .references(() => users.id)
    .notNull(),

  type: transactionsTypeEnum("type").notNull(),

  description: text("description"),

  amount: numberHelper("amount").notNull().default("0"),

  from: uuid("from")
    .references(() => accounts.id)
    .notNull(),

  //For fixed transactions
  cycle: timestamp("cycle", { withTimezone: true }).defaultNow(),
  is_active: boolean("is_active"),

  ...timestampColumns,
});

export const transactions_splits = pgTable("transactions_splits", {
  ...idColumn,

  transaction_id: uuid("transaction_id")
    .references(() => transactions.id)
    .notNull(),
  account_id: uuid("account_id")
    .references(() => accounts.id)
    .notNull(),

  amount: numberHelper("amount").notNull().default("0"),

  state: transactionsSplitsStateEnum("state").notNull().default("Pending"),
});
