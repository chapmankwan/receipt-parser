import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and } from "drizzle-orm";
import { router, protectedProcedure } from "@/server/trpc";
import { categories } from "@/db/schema";
import { db } from "@/db";

// The db type inferred directly from the client instance
type Db = typeof db;

// ---------------------------------------------------------------------------
// Reusable ownership check
// Throws NOT_FOUND if the category doesn't exist or belongs to another user.
// ---------------------------------------------------------------------------

async function assertOwnership(dbClient: Db, categoryId: string, userId: string) {
  const category = await dbClient.query.categories.findFirst({
    where: and(
      eq(categories.id, categoryId),
      eq(categories.userId, userId)
    ),
  });

  if (!category) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Category not found",
    });
  }

  return category;
}

// ---------------------------------------------------------------------------
// Category router
// ---------------------------------------------------------------------------

export const categoryRouter = router({

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.categories.findMany({
      where: eq(categories.userId, ctx.user.id),
      orderBy: (categories, { asc }) => [asc(categories.name)],
    });
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return assertOwnership(ctx.db, input.id, ctx.user.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required").max(50),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color e.g. #4CAF50")
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.categories.findFirst({
        where: and(
          eq(categories.userId, ctx.user.id),
          eq(categories.name, input.name)
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `You already have a category named "${input.name}"`,
        });
      }

      const [category] = await ctx.db
        .insert(categories)
        .values({
          userId: ctx.user.id,
          name:   input.name,
          color:  input.color,
        })
        .returning();

      return category;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id:    z.string().uuid(),
        name:  z.string().min(1).max(50).optional(),
        color: z
          .string()
          .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color")
          .nullable()
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.db, input.id, ctx.user.id);

      const { id, ...fields } = input;

      const [updated] = await ctx.db
        .update(categories)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(categories.id, id))
        .returning();

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnership(ctx.db, input.id, ctx.user.id);

      await ctx.db
        .delete(categories)
        .where(eq(categories.id, input.id));

      return { success: true };
    }),
});