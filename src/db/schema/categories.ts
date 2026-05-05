import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { primaryKey, timestamps } from "./_helpers";
import { users } from "./users";

// ---------------------------------------------------------------------------
// categories
//
// User-defined tags for line items: "Produce", "Dairy", "Snacks", etc.
// Claude suggests a category when parsing; the user can override it.
// Per-user so everyone can have their own taxonomy.
// ---------------------------------------------------------------------------

export const categories = pgTable("categories", {
  ...primaryKey,

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  name: text("name").notNull(),   // "Produce"
  color: text("color"),           // Optional hex color for UI badges, e.g. "#4CAF50"

  ...timestamps,
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
