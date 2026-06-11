import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { idColumn, numberHelper, timestampColumns } from "../helpers.js";
import { transactionsTypeEnum } from "./transactions.js";
import { users } from "./users.js";

export const budgets = pgTable("budgets", {
  ...idColumn,

  user_id: uuid("user_id")
    .references(() => users.id)
    .notNull(),

  name: text("name"),

  monthly_limit: numberHelper("monthly_limit").notNull(),
  about_type: transactionsTypeEnum("about_type"),

  ...timestampColumns,
});
