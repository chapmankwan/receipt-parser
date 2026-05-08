import { router } from "@/server/trpc";
import { healthRouter }   from "@/server/routers/health";
import { storeRouter }    from "@/server/routers/store";
import { categoryRouter } from "@/server/routers/category";
import { receiptRouter }  from "@/server/routers/receipt";

export const appRouter = router({
  health:   healthRouter,
  store:    storeRouter,
  category: categoryRouter,
  receipt:  receiptRouter,
});

export type AppRouter = typeof appRouter;