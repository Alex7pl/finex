import { sql } from "drizzle-orm";
import { boolean, check, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { idColumn, moneyColumn, timestampColumns } from "../helpers.js";
import { accounts } from "./accounts.js";
import { categories } from "./categories.js";
import { users } from "./users.js";

export const debts = pgTable("debts", {
  ...idColumn,

  user_id: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" })
    .notNull(),
  account_id: uuid("account_id")
    .references(() => accounts.id, { onDelete: "restrict", onUpdate: "cascade" })
    .notNull(),

  name: text("name").notNull(),
  category_id: uuid("category_id").references(() => categories.id, { onDelete: "set null", onUpdate: "cascade" }),
  is_active: boolean("is_active").notNull().default(true),

  // for debts with interest
  capital: moneyColumn("capital"),
  interests: moneyColumn("interests"),
  time_limit: timestamp("time_limit", { withTimezone: true }),

  // for simple debts
  quota: moneyColumn("quota").notNull(),

  ...timestampColumns,
}, (table) => [
  index("debts_user_id_idx").on(table.user_id),
  index("debts_account_id_idx").on(table.account_id),
  check("debts_capital_non_negative", sql`${table.capital} IS NULL OR ${table.capital} >= 0`),
  check("debts_interests_non_negative", sql`${table.interests} IS NULL OR ${table.interests} >= 0`),
  check("debts_quota_positive", sql`${table.quota} > 0`),
  check("debts_interest_requires_capital", sql`${table.capital} IS NOT NULL OR ${table.interests} IS NULL`),
]);
