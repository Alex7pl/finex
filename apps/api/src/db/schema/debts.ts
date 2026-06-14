import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { idColumn, moneyColumn, timestampColumns } from "../helpers.js";
import { accounts } from "./accounts.js";
import { users } from "./users.js";

export const debts = pgTable("debts", {
  ...idColumn,

  user_id: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" })
    .notNull(),
  account_id: uuid("account_id")
    .references(() => accounts.id, { onDelete: "restrict", onUpdate: "cascade" })
    .notNull(),

  name: text("name"),

  // for debts with interest
  capital: moneyColumn("capital"),
  interests: moneyColumn("interests"),
  time_limit: timestamp("time_limit", { withTimezone: true }).defaultNow(),

  // for simple debts
  quota: moneyColumn("quota"),

  ...timestampColumns,
}, (table) => [
  index("debts_user_id_idx").on(table.user_id),
  index("debts_account_id_idx").on(table.account_id),
  check("debts_capital_non_negative", sql`${table.capital} IS NULL OR ${table.capital} >= 0`),
  check("debts_interests_non_negative", sql`${table.interests} IS NULL OR ${table.interests} >= 0`),
  check("debts_quota_non_negative", sql`${table.quota} IS NULL OR ${table.quota} >= 0`),
]);
