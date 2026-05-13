import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { router, protectedProcedure } from "@/server/trpc";
import { receipts, lineItems, stores, categories } from "@/db/schema";
import type { NewReceipt, NewLineItem, NewStore } from "@/db/schema";
import { db } from "@/db";
import { createClient } from "@supabase/supabase-js";
import { parseReceipt } from "@/server/lib/receiptParser";
import { env } from "@/env";

type Db = typeof db;

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const lineItemSchema = z.object({
  rawName:      z.string().min(1),
  resolvedName: z.string().min(1),
  quantityType: z.enum(["unit", "weight"]),
  quantity:     z.number().positive(),
  weightUnit:   z.enum(["lb", "kg", "oz", "g"]).nullable(),
  unitPrice:    z.number().positive(),
  totalPrice:   z.number().positive(),
  categoryName: z.string().nullable(),
});

const storeSchema = z.object({
  id:       z.string().uuid().optional(),
  name:     z.string().min(1).max(100),
  chain:    z.string().max(100).nullable(),
  location: z.string().max(200).nullable(),
});

export const receiptInputSchema = z.object({
  store:       storeSchema,
  purchasedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  subtotal:    z.number().nullable(),
  tax:         z.number().nullable(),
  total:       z.number().positive("Total must be greater than 0"),
  currency:    z.string().length(3).default("CAD"),
  notes:       z.string().max(500).nullable(),
  lineItems:   z.array(lineItemSchema).min(1, "At least one item is required"),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function resolveStore(
  dbClient: Db,
  userId: string,
  input: z.infer<typeof storeSchema>
): Promise<string> {
  if (input.id) {
    const existing = await dbClient.query.stores.findFirst({
      where: and(eq(stores.id, input.id), eq(stores.userId, userId)),
    });
    if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Store not found" });
    return existing.id;
  }

  const duplicate = await dbClient.query.stores.findFirst({
    where: and(eq(stores.userId, userId), eq(stores.name, input.name)),
  });
  if (duplicate) return duplicate.id;

  const newStore: NewStore = {
    userId,
    name:     input.name,
    chain:    input.chain ?? undefined,
    location: input.location ?? undefined,
  };
  const [created] = await dbClient.insert(stores).values(newStore).returning();
  return created!.id;
}

async function resolveCategory(
  dbClient: Db,
  userId: string,
  categoryName: string,
  cache: Map<string, string>
): Promise<string> {
  const cached = cache.get(categoryName);
  if (cached) return cached;

  const existing = await dbClient.query.categories.findFirst({
    where: and(eq(categories.userId, userId), eq(categories.name, categoryName)),
  });
  if (existing) {
    cache.set(categoryName, existing.id);
    return existing.id;
  }

  const [created] = await dbClient
    .insert(categories)
    .values({ userId, name: categoryName })
    .returning();
  cache.set(categoryName, created!.id);
  return created!.id;
}

// ---------------------------------------------------------------------------
// Receipt router
// ---------------------------------------------------------------------------

export const receiptRouter = router({

  // -------------------------------------------------------------------------
  // receipt.parse — upload image → parse → return data for review (no DB write)
  // -------------------------------------------------------------------------

  parse: protectedProcedure
    .input(
      z.object({
        storagePath: z.string().min(1),
        mimeType:    z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
      })
    )
    .mutation(async ({ input }) => {
      const supabase = createClient(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );

      const { data: fileData, error: downloadError } = await supabase.storage
        .from(env.SUPABASE_RECEIPT_BUCKET)
        .download(input.storagePath);

      if (downloadError ?? !fileData) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Could not retrieve uploaded image — it may have already been deleted",
        });
      }

      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      const { error: deleteError } = await supabase.storage
        .from(env.SUPABASE_RECEIPT_BUCKET)
        .remove([input.storagePath]);

      if (deleteError) {
        console.error("[receipt.parse] Failed to delete image:", deleteError.message);
      }

      try {
        return await parseReceipt(base64, input.mimeType);
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: err instanceof Error ? err.message : "Failed to parse receipt",
        });
      }
    }),

  // -------------------------------------------------------------------------
  // receipt.create — save confirmed receipt + line items in a transaction
  // -------------------------------------------------------------------------

  create: protectedProcedure
    .input(receiptInputSchema)
    .mutation(async ({ ctx, input }) => {
      return await ctx.db.transaction(async (tx) => {
        const storeId = await resolveStore(tx as unknown as Db, ctx.user.id, input.store);

        const newReceipt: NewReceipt = {
          userId:      ctx.user.id,
          storeId,
          purchasedOn: input.purchasedOn,
          subtotal:    input.subtotal?.toString() ?? undefined,
          tax:         input.tax?.toString()      ?? undefined,
          total:       input.total.toString(),
          currency:    input.currency,
          notes:       input.notes ?? undefined,
        };

        const [receipt] = await tx.insert(receipts).values(newReceipt).returning();
        if (!receipt) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create receipt" });

        const categoryCache = new Map<string, string>();

        const lineItemRows: NewLineItem[] = await Promise.all(
          input.lineItems.map(async (item) => {
            let categoryId: string | undefined;
            if (item.categoryName) {
              categoryId = await resolveCategory(
                tx as unknown as Db, ctx.user.id, item.categoryName, categoryCache
              );
            }
            return {
              receiptId:     receipt.id,
              categoryId,
              rawName:       item.rawName,
              resolvedName:  item.resolvedName,
              quantityType:  item.quantityType,
              quantity:      item.quantity.toString(),
              weightUnit:    item.weightUnit ?? undefined,
              unitPrice:     item.unitPrice.toString(),
              totalPrice:    item.totalPrice.toString(),
              userConfirmed: true,
            };
          })
        );

        await tx.insert(lineItems).values(lineItemRows);
        return { receiptId: receipt.id };
      });
    }),

  // -------------------------------------------------------------------------
  // receipt.update — edit receipt-level fields on a saved receipt
  // -------------------------------------------------------------------------

  update: protectedProcedure
    .input(
      z.object({
        id:          z.string().uuid(),
        store:       storeSchema.optional(),
        purchasedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        subtotal:    z.number().nullable().optional(),
        tax:         z.number().nullable().optional(),
        total:       z.number().positive().optional(),
        currency:    z.string().length(3).optional(),
        notes:       z.string().max(500).nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.receipts.findFirst({
        where: and(eq(receipts.id, input.id), eq(receipts.userId, ctx.user.id)),
      });

      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found" });

      let storeId = existing.storeId;
      if (input.store) {
        storeId = await resolveStore(ctx.db, ctx.user.id, input.store);
      }

      const [updated] = await ctx.db
        .update(receipts)
        .set({
          ...(input.purchasedOn !== undefined && { purchasedOn: input.purchasedOn }),
          ...(input.subtotal    !== undefined && { subtotal:    input.subtotal?.toString() ?? null }),
          ...(input.tax         !== undefined && { tax:         input.tax?.toString()      ?? null }),
          ...(input.total       !== undefined && { total:       input.total.toString() }),
          ...(input.currency    !== undefined && { currency:    input.currency }),
          ...(input.notes       !== undefined && { notes:       input.notes ?? null }),
          storeId,
          updatedAt: new Date(),
        })
        .where(eq(receipts.id, input.id))
        .returning();

      return updated;
    }),

  // -------------------------------------------------------------------------
  // receipt.updateLineItem — edit a single line item on a saved receipt
  // -------------------------------------------------------------------------

  updateLineItem: protectedProcedure
    .input(
      z.object({
        lineItemId:   z.string().uuid(),
        resolvedName: z.string().min(1).max(200).optional(),
        categoryName: z.string().min(1).max(50).nullable().optional(),
        quantityType: z.enum(["unit", "weight"]).optional(),
        quantity:     z.number().positive().optional(),
        weightUnit:   z.enum(["lb", "kg", "oz", "g"]).nullable().optional(),
        unitPrice:    z.number().positive().optional(),
        totalPrice:   z.number().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch item and verify ownership via parent receipt
      const item = await ctx.db.query.lineItems.findFirst({
        where: eq(lineItems.id, input.lineItemId),
        with:  { receipt: true },
      });

      if (!item || item.receipt.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Line item not found" });
      }

      // Resolve category
      let categoryId = item!.categoryId;
      if (input.categoryName === null) {
        categoryId = null;
      } else if (input.categoryName !== undefined) {
        categoryId = await resolveCategory(
          ctx.db, ctx.user.id, input.categoryName, new Map()
        );
      }

      const [updated] = await ctx.db
        .update(lineItems)
        .set({
          ...(input.resolvedName !== undefined && { resolvedName: input.resolvedName }),
          ...(input.quantityType !== undefined && { quantityType: input.quantityType }),
          ...(input.quantity     !== undefined && { quantity:     input.quantity.toString() }),
          ...(input.weightUnit   !== undefined && { weightUnit:   input.weightUnit ?? undefined }),
          ...(input.unitPrice    !== undefined && { unitPrice:    input.unitPrice.toString() }),
          ...(input.totalPrice   !== undefined && { totalPrice:   input.totalPrice.toString() }),
          categoryId,
          userConfirmed: true,
          updatedAt:     new Date(),
        })
        .where(eq(lineItems.id, input.lineItemId))
        .returning();

      return updated;
    }),

  // -------------------------------------------------------------------------
  // receipt.list
  // -------------------------------------------------------------------------

  list: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20), offset: z.number().min(0).default(0) }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.receipts.findMany({
        where:   eq(receipts.userId, ctx.user.id),
        orderBy: [desc(receipts.purchasedOn)],
        limit:   input.limit,
        offset:  input.offset,
        with:    { store: true },
      });
    }),


  // -------------------------------------------------------------------------
  // receipt.listWithCounts
  //
  // Same as receipt.list but includes total item count and unconfirmed count
  // per receipt. Uses a SQL aggregation so it's one query, not N+1.
  //
  // confirmedCount  — items the user has reviewed
  // totalCount      — all items on the receipt
  // needsReview     — true if any items are unconfirmed
  // -------------------------------------------------------------------------

  listWithCounts: protectedProcedure
    .input(
      z.object({
        limit:  z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Fetch receipts with their store
      const rows = await ctx.db.query.receipts.findMany({
        where:   eq(receipts.userId, ctx.user.id),
        orderBy: [desc(receipts.purchasedOn)],
        limit:   input.limit,
        offset:  input.offset,
        with:    { store: true },
      });

      if (rows.length === 0) return [];

      // Aggregate item counts per receipt in a single query
      const receiptIds = rows.map((r) => r.id);

      const counts = await ctx.db
        .select({
          receiptId:      lineItems.receiptId,
          totalCount:     count(),
          confirmedCount: count(lineItems.userConfirmed),
        })
        .from(lineItems)
        .where(
          receiptIds.length === 1
            ? eq(lineItems.receiptId, receiptIds[0]!)
            : sql`${lineItems.receiptId} = ANY(ARRAY[${sql.join(
                receiptIds.map((id) => sql`${id}::uuid`),
                sql`, `
              )}])`
        )
        .groupBy(lineItems.receiptId);

      // Build a lookup map for O(1) access
      const countMap = new Map(
        counts.map((c) => [c.receiptId, c])
      );

      return rows.map((receipt) => {
        const c = countMap.get(receipt.id);
        return {
          ...receipt,
          totalCount:     c?.totalCount     ?? 0,
          confirmedCount: c?.confirmedCount ?? 0,
          needsReview:    (c?.confirmedCount ?? 0) < (c?.totalCount ?? 0),
        };
      });
    }),

  // -------------------------------------------------------------------------
  // receipt.byId
  // -------------------------------------------------------------------------

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const receipt = await ctx.db.query.receipts.findFirst({
        where: and(eq(receipts.id, input.id), eq(receipts.userId, ctx.user.id)),
        with:  { store: true, lineItems: { with: { category: true } } },
      });

      if (!receipt) throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found" });
      return receipt;
    }),

  // -------------------------------------------------------------------------
  // receipt.delete
  // -------------------------------------------------------------------------

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.receipts.findFirst({
        where: and(eq(receipts.id, input.id), eq(receipts.userId, ctx.user.id)),
      });

      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found" });

      await ctx.db.delete(receipts).where(eq(receipts.id, input.id));
      return { success: true };
    }),
});