import { sql } from "drizzle-orm";
import { timestamp, uuid } from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Reusable column helpers
//
// Every table gets:
//   id          — auto-generated UUID primary key
//   created_at  — set once on insert, never changes
//   updated_at  — auto-updates on every write (via Postgres trigger below)
// ---------------------------------------------------------------------------

export const primaryKey = {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
};

export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
};
