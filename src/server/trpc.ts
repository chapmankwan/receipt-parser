import { initTRPC, TRPCError } from "@trpc/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { cache } from "react";
import type { User } from "@/db/schema";

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const createTRPCContext = cache(async () => {
  const { userId: clerkId } = await auth();
  return { db, clerkId };
});

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

const t = initTRPC.context<TRPCContext>().create();

export const router     = t.router;
export const middleware = t.middleware;

export const publicProcedure = t.procedure;

// ---------------------------------------------------------------------------
// Auth middleware
//
// Explicitly types the extended context so downstream procedures know
// ctx.user is always a fully populated User row — never undefined.
// ---------------------------------------------------------------------------

const enforceAuth = middleware(async ({ ctx, next }) => {
  if (!ctx.clerkId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be signed in to do that",
    });
  }

  let user = await ctx.db.query.users.findFirst({
    where: eq(users.clerkId, ctx.clerkId),
  });

  if (!user) {
    const clerkUser = await currentUser();

    if (!clerkUser) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Could not retrieve user profile",
      });
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No email address found on account",
      });
    }

    [user] = await ctx.db
      .insert(users)
      .values({ clerkId: ctx.clerkId, email })
      .returning();
  }

  // Cast here is safe — if we reach this point, user is always defined.
  // The throw branches above ensure we never get here with user undefined.
  return next({
    ctx: {
      ...ctx,
      user: user as User,
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceAuth);