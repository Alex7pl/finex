import { sql } from "drizzle-orm";
import {
  check,
  index,
  pgTable,
  text,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import {
  idColumn,
  moneyColumn,
  rateColumn,
  timestampColumns,
} from "../helpers.js";
import { users } from "./users.js";

export const accounts = pgTable(
  "accounts",
  {
    ...idColumn,
    user_id: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" })
      .notNull(),

    name: text("name").notNull(),
    emoji: varchar("emoji"),
    color: varchar("color"),

    initial_balance: moneyColumn("initial_balance").notNull().default("0"),
    annual_interest_rate: rateColumn("annual_interest_rate"),
    interest_payment_rate: rateColumn("interest_payment_rate"),

    ...timestampColumns,
  },
  (table) => [
    index("accounts_user_id_idx").on(table.user_id),
    check(
      "accounts_annual_interest_rate_range",
      sql`${table.annual_interest_rate} IS NULL OR (${table.annual_interest_rate} >= 0 AND ${table.annual_interest_rate} <= 100)`,
    ),
    check(
      "accounts_interest_payment_rate_range",
      sql`${table.interest_payment_rate} IS NULL OR (${table.interest_payment_rate} >= 0 AND ${table.interest_payment_rate} <= 100)`,
    ),
  ],
);
