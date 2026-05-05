import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { env } from "@/env";

// ---------------------------------------------------------------------------
// Database client
//
// We create one postgres connection pool for the whole app and wrap it with
// Drizzle. Import `db` wherever you need to query the database.
//
// The `schema` object gives Drizzle the table definitions it needs to build
// type-safe query helpers — without it you'd have to use raw SQL everywhere.
//
// Connection pooling note:
// In a serverless environment (Vercel), each function invocation is stateless.
// Use Supabase's connection pooler URL (port 6543, pgmode=transaction) rather
// than the direct connection (port 5432). The pooler reuses Postgres connections
// across invocations so you don't exhaust the connection limit.
// ---------------------------------------------------------------------------

// Prevent multiple instances in development (Next.js hot reload creates new
// modules on every save, which would open a new connection each time).
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

const conn = globalForDb.conn ?? postgres(env.DATABASE_URL);
if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });

// Re-export schema so callers can import table refs from one place:
//   import { db, receipts } from "@/db"
export * from "./schema";
