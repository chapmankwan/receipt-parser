import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { sql } from "drizzle-orm";

export const healthRouter = router({

  // Public ping — confirms tRPC is reachable, no auth needed
  ping: publicProcedure.query(() => {
    return {
      ok: true,
      message: "tRPC is working",
      timestamp: new Date().toISOString(),
    };
  }),

  // Protected check — confirms auth middleware + DB are both working
  check: protectedProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.execute(sql`SELECT NOW() as db_time`);
    const firstRow = result[0] as { db_time: unknown } | undefined;

    return {
      ok: true,
      message: "Auth and database are working",
      user: {
        id:    ctx.user.id,
        email: ctx.user.email,
      },
      dbTime: firstRow?.db_time,
      timestamp: new Date().toISOString(),
    };
  }),
});