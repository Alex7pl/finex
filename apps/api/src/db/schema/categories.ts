import { index, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "../helpers.js";
import { users } from "./users.js";

export const categoryKindEnum = pgEnum("category_kind", ["income", "expense"]);

export const categories = pgTable(
  "categories",
  {
    ...idColumn,
    user_id: uuid("user_id").notNull().references(() => users.id, {
      onDelete: "cascade", onUpdate: "cascade",
    }),
    name: text("name").notNull(),
    kind: categoryKindEnum("kind").notNull(),
    emoji: text("emoji"),
    color: text("color"),
    ...timestampColumns,
  },
  (table) => [index("categories_user_id_idx").on(table.user_id)],
);
