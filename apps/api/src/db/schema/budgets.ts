import { sql } from "drizzle-orm";
import { check, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { idColumn, moneyColumn, timestampColumns } from "../helpers.js";
import { transactionsTypeEnum } from "./transactions.js";
import { categories } from "./categories.js";
import { users } from "./users.js";

export const budgets = pgTable(
  "budgets",
  {
    ...idColumn,

    user_id: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" })
      .notNull(),

    name: text("name"),

    monthly_limit: moneyColumn("monthly_limit").notNull(),
    about_type: transactionsTypeEnum("about_type"),
    category_id: uuid("category_id").references(() => categories.id, {
      onDelete: "restrict",
      onUpdate: "cascade",
    }),

    ...timestampColumns,
  },
  (table) => [
    index("budgets_user_id_idx").on(table.user_id),
    check("budgets_monthly_limit_positive", sql`${table.monthly_limit} > 0`),
  ],
);
