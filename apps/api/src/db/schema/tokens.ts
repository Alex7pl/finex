import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { idColumn, timestampColumns } from "../helpers.js";
import { users } from "./users.js";

export const user_tokens = pgTable("user_tokens", {
  ...idColumn,
  user_id: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" })
    .notNull(),
  family_id: uuid("family_id").notNull(),

  token_hash: text("token_hash").notNull(),
  expires_at: timestamp("expires_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  revoked_at: timestamp("revoked_at", { withTimezone: true }),
  user_agent: text("user_agent"),
  ip_address: text("ip_address"),

  ...timestampColumns,
});
