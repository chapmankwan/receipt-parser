import { pgTable, text, unique } from "drizzle-orm/pg-core";
import { primaryKey, timestamps } from "./_helpers";

// ---------------------------------------------------------------------------
// users
//
// We don't store passwords or handle auth ourselves — Clerk does that.
// This table exists so we can attach receipts, stores, and categories to a
// user without depending on Clerk's API for every database query.
//
// clerk_id is the stable ID Clerk gives every user (e.g. "user_2abc...").
// We check it on every request via Clerk's middleware and use it to look up
// our internal user record.
// ---------------------------------------------------------------------------

export const users = pgTable(
  "users",
  {
    ...primaryKey,

    // Clerk's user ID — used to link our data to Clerk's auth session.
    // unique() ensures one row per Clerk user.
    clerkId: text("clerk_id").notNull(),

    email: text("email").notNull(),

    ...timestamps,
  },
  (t) => [
    // Enforce uniqueness at the DB level, not just in application code.
    unique("users_clerk_id_unique").on(t.clerkId),
    unique("users_email_unique").on(t.email),
  ]
);

export type User = typeof users.$inferSelect; // what you get back from a query
export type NewUser = typeof users.$inferInsert; // what you pass to an insert
