// ---------------------------------------------------------------------------
// Single export point for the entire schema.
//
// Import from here in your Drizzle db client and in tRPC routers:
//   import { users, receipts, lineItems } from "@/db/schema";
//
// Drizzle's drizzle() constructor accepts this object directly — it uses it
// to build type-safe query helpers for every table.
// ---------------------------------------------------------------------------

export * from "./_helpers";
export * from "./users";
export * from "./stores";
export * from "./categories";
export * from "./receipts";
export * from "./relations";
