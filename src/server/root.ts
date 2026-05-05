import { router } from "@/server/trpc";
import { healthRouter } from "@/server/routers/health";

// ---------------------------------------------------------------------------
// App router — the root that combines all sub-routers.
//
// As we add routers in later steps, import and register them here:
//   import { storeRouter }    from "@/server/routers/store";
//   import { categoryRouter } from "@/server/routers/category";
//   import { receiptRouter }  from "@/server/routers/receipt";
//
// The key name becomes the namespace on the client:
//   trpc.health.ping.useQuery()
//   trpc.receipt.create.useMutation()
// ---------------------------------------------------------------------------

export const appRouter = router({
  health: healthRouter,
  // store:    storeRouter,    ← step 6
  // category: categoryRouter, ← step 6
  // receipt:  receiptRouter,  ← step 7
});

// Export the router type — imported by the tRPC client so types flow through
export type AppRouter = typeof appRouter;