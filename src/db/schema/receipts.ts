import { pgEnum, pgTable, text, uuid, numeric, boolean, date } from "drizzle-orm/pg-core";
import { primaryKey, timestamps } from "./_helpers";
import { users } from "./users";
import { stores } from "./stores";
import { categories } from "./categories";

// ---------------------------------------------------------------------------
// Enums
//
// Postgres enums are checked at the DB level — you can't accidentally insert
// "WEIGHT" (uppercase) or "grams" (not in the list). Drizzle generates the
// CREATE TYPE statement automatically when you run migrations.
// ---------------------------------------------------------------------------

// How a line item's quantity is measured.
export const quantityTypeEnum = pgEnum("quantity_type", [
  "unit",    // Normal item: 2 x yogurt @ $1.99 each
  "weight",  // Bulk item:  1.2 lb oranges @ $1.99/lb
]);

// Weight units Claude might extract from a receipt.
export const weightUnitEnum = pgEnum("weight_unit", [
  "lb",
  "kg",
  "oz",
  "g",
]);

// ---------------------------------------------------------------------------
// receipts
//
// One row per shopping trip. Stores the totals as printed on the receipt
// (subtotal, tax, total) in addition to the line items, so we can detect
// if our parsed line items don't add up to the printed total.
//
// currency defaults to "CAD" since you're shopping in Vancouver.
// ---------------------------------------------------------------------------

export const receipts = pgTable("receipts", {
  ...primaryKey,

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  storeId: uuid("store_id")
    .references(() => stores.id, {
      // If a store is deleted, keep the receipt but set storeId to null.
      // You don't want to lose purchase history just because you renamed a store.
      onDelete: "set null",
    }),

  // The date printed on the receipt — not necessarily today.
  // date type stores YYYY-MM-DD without a timezone, which is correct for
  // "the day you shopped" (a wall-clock date, not an instant in time).
  purchasedOn: date("purchased_on").notNull(),

  // Totals as printed. numeric(10,2) means up to 10 digits, 2 decimal places.
  // We use numeric (not float) for money — floats have rounding errors.
  subtotal: numeric("subtotal", { precision: 10, scale: 2 }),
  tax:      numeric("tax",      { precision: 10, scale: 2 }),
  total:    numeric("total",    { precision: 10, scale: 2 }).notNull(),

  currency: text("currency").notNull().default("CAD"),

  // Free-text notes the user can add, e.g. "weekly shop", "birthday dinner"
  notes: text("notes"),

  ...timestamps,
});

export type Receipt = typeof receipts.$inferSelect;
export type NewReceipt = typeof receipts.$inferInsert;

// ---------------------------------------------------------------------------
// line_items
//
// One row per line on the receipt. This is where the interesting design
// decisions live for your edge cases.
//
// raw_name vs resolved_name
// ─────────────────────────
// raw_name     = exactly what's printed: "PTO YLW", "BNLS CHKN BRS"
// resolved_name = Claude's human-readable version: "yellow potato", "boneless chicken breast"
// We keep both so users can verify the parse, and so we can build a correction
// table later (if "PTO YLW" at Superstore is always "yellow potato", remember that).
//
// Weight items
// ────────────
// quantity_type = "weight"
// quantity      = the weight, e.g. 1.2
// unit          = "lb"
// unit_price    = price per lb, e.g. 1.99
// total_price   = quantity × unit_price, e.g. 2.39
//
// Unit items
// ──────────
// quantity_type = "unit"
// quantity      = number of items, e.g. 3
// unit          = null (or "each" if you prefer)
// unit_price    = price per item, e.g. 2.49
// total_price   = quantity × unit_price, e.g. 7.47
//
// user_confirmed
// ──────────────
// Defaults to false after Claude parses. Flips to true when the user
// reviews and confirms the receipt. Unconfirmed items are excluded from
// spending analytics — you don't want misread receipts skewing your charts.
// ---------------------------------------------------------------------------

export const lineItems = pgTable("line_items", {
  ...primaryKey,

  receiptId: uuid("receipt_id")
    .notNull()
    .references(() => receipts.id, {
      // If a receipt is deleted, delete all its line items.
      onDelete: "cascade",
    }),

  categoryId: uuid("category_id")
    .references(() => categories.id, {
      // If a category is deleted, keep the item but clear its category.
      onDelete: "set null",
    }),

  // What's printed on the receipt — preserved for debugging/correction.
  rawName: text("raw_name").notNull(),

  // Claude's best guess at the full product name.
  resolvedName: text("resolved_name").notNull(),

  // "unit" or "weight" — drives how quantity, unit, and unit_price are shown.
  quantityType: quantityTypeEnum("quantity_type").notNull().default("unit"),

  // For unit items: number of items (e.g. 3).
  // For weight items: the weight (e.g. 1.2).
  quantity: numeric("quantity", { precision: 10, scale: 4 }).notNull().default("1"),

  // Only populated for weight items: "lb", "kg", etc.
  // null for regular unit purchases.
  weightUnit: weightUnitEnum("weight_unit"),

  // Price per unit or per lb/kg.
  unitPrice: numeric("unit_price", { precision: 10, scale: 4 }).notNull(),

  // The actual line total as printed. We store this separately rather than
  // computing it from quantity × unit_price, because receipt rounding sometimes
  // makes them differ by a cent. Source of truth is what's on the receipt.
  totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),

  // Has the user reviewed and confirmed this item? Unconfirmed = Claude's guess only.
  userConfirmed: boolean("user_confirmed").notNull().default(false),

  ...timestamps,
});

export type LineItem = typeof lineItems.$inferSelect;
export type NewLineItem = typeof lineItems.$inferInsert;
