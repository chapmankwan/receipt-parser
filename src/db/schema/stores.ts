import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { primaryKey, timestamps } from "./_helpers";
import { users } from "./users";

// ---------------------------------------------------------------------------
// stores
//
// A store is any physical (or online) shop a user buys from.
// Keeping stores as their own table lets us:
//   - Show per-store spending analytics
//   - Associate abbreviation patterns with a specific chain over time
//     (e.g. "BNLS CHKN" at Costco always means "boneless chicken")
//   - Auto-suggest the store on future receipts from the same location
//
// chain vs name:
//   name  = the specific location, e.g. "Costco Burnaby"
//   chain = the brand, e.g. "Costco"
//   This lets you group all Costco receipts together while still knowing
//   which branch you visited.
// ---------------------------------------------------------------------------

export const stores = pgTable("stores", {
  ...primaryKey,

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      // If the user is deleted, delete their stores too.
      onDelete: "cascade",
    }),

  name: text("name").notNull(),       // "Costco Burnaby"
  chain: text("chain"),               // "Costco" — nullable, inferred by Claude
  location: text("location"),         // Free-text address or neighbourhood

  ...timestamps,
});

export type Store = typeof stores.$inferSelect;
export type NewStore = typeof stores.$inferInsert;
