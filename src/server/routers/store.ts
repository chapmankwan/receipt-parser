import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { router, protectedProcedure } from "@/server/trpc";
import { stores } from "@/db/schema";

// ---------------------------------------------------------------------------
// Store router
//
// All procedures require auth. Every query/mutation is scoped to ctx.user.id
// so a user can only ever see or modify their own stores.
//
// Procedures:
//   store.list    — all stores belonging to the current user
//   store.byId    — single store, with ownership check
//   store.create  — create a new store
//   store.update  — update name, chain, or location
//   store.delete  — delete a store (receipts are preserved, storeId set null)
// ---------------------------------------------------------------------------

export const storeRouter = router({

  // -------------------------------------------------------------------------
  // store.list
  // -------------------------------------------------------------------------

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.stores.findMany({
      where: eq(stores.userId, ctx.user.id),
      orderBy: (stores, { asc }) => [asc(stores.name)],
    });
  }),

  // -------------------------------------------------------------------------
  // store.byId
  // -------------------------------------------------------------------------

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const store = await ctx.db.query.stores.findFirst({
        where: and(
          eq(stores.id, input.id),
          eq(stores.userId, ctx.user.id)
        ),
      });

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
        });
      }

      return store;
    }),

  // -------------------------------------------------------------------------
  // store.create
  // -------------------------------------------------------------------------

  create: protectedProcedure
    .input(
      z.object({
        name:     z.string().min(1, "Name is required").max(100),
        chain:    z.string().max(100).optional(),
        location: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.stores.findFirst({
        where: and(
          eq(stores.userId, ctx.user.id),
          eq(stores.name, input.name)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `You already have a store named "${input.name}"`,
        });
      }

      const [store] = await ctx.db
        .insert(stores)
        .values({
          userId:   ctx.user.id,
          name:     input.name,
          chain:    input.chain,
          location: input.location,
        })
        .returning();

      return store;
    }),

  // -------------------------------------------------------------------------
  // store.update
  // -------------------------------------------------------------------------

  update: protectedProcedure
    .input(
      z.object({
        id:       z.string().uuid(),
        name:     z.string().min(1).max(100).optional(),
        chain:    z.string().max(100).optional(),
        location: z.string().max(200).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership before updating
      const existing = await ctx.db.query.stores.findFirst({
        where: and(
          eq(stores.id, input.id),
          eq(stores.userId, ctx.user.id)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
        });
      }

      const { id, ...fields } = input;

      const [updated] = await ctx.db
        .update(stores)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(stores.id, id))
        .returning();

      return updated;
    }),

  // -------------------------------------------------------------------------
  // store.delete
  // -------------------------------------------------------------------------

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.stores.findFirst({
        where: and(
          eq(stores.id, input.id),
          eq(stores.userId, ctx.user.id)
        ),
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found",
        });
      }

      await ctx.db
        .delete(stores)
        .where(eq(stores.id, input.id));

      // Receipts that referenced this store have storeId set to null
      // automatically via the ON DELETE SET NULL constraint in the schema.
      return { success: true };
    }),
});