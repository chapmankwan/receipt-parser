import { relations } from "drizzle-orm";
import { users } from "./users";
import { stores } from "./stores";
import { categories } from "./categories";
import { receipts, lineItems } from "./receipts";

// ---------------------------------------------------------------------------
// Relations
//
// These tell Drizzle how tables connect so you can use the `with:` syntax
// in queries to join related data in one call:
//
//   db.query.receipts.findMany({
//     with: {
//       store: true,          // JOIN stores
//       lineItems: {
//         with: {
//           category: true,   // JOIN categories
//         },
//       },
//     },
//   });
//
// Relations are purely for the query builder — they don't create FK
// constraints (those are in the schema files).
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  receipts:   many(receipts),
  stores:     many(stores),
  categories: many(categories),
}));

export const storesRelations = relations(stores, ({ one, many }) => ({
  user:     one(users,    { fields: [stores.userId],    references: [users.id] }),
  receipts: many(receipts),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user:      one(users, { fields: [categories.userId], references: [users.id] }),
  lineItems: many(lineItems),
}));

export const receiptsRelations = relations(receipts, ({ one, many }) => ({
  user:      one(users,   { fields: [receipts.userId],  references: [users.id] }),
  store:     one(stores,  { fields: [receipts.storeId], references: [stores.id] }),
  lineItems: many(lineItems),
}));

export const lineItemsRelations = relations(lineItems, ({ one }) => ({
  receipt:  one(receipts,   { fields: [lineItems.receiptId],  references: [receipts.id] }),
  category: one(categories, { fields: [lineItems.categoryId], references: [categories.id] }),
}));
