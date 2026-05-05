import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/root";
import { createTRPCContext } from "@/server/trpc";

// ---------------------------------------------------------------------------
// tRPC HTTP handler
//
// A single catch-all route that handles every tRPC call.
// GET  → queries  (e.g. health.ping)
// POST → mutations (e.g. receipt.create)
//
// The URL pattern is /api/trpc/[procedure]
// e.g. /api/trpc/health.ping
//      /api/trpc/receipt.create
// ---------------------------------------------------------------------------

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError:
      process.env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(`[tRPC error] ${path ?? "<unknown>"}:`, error);
          }
        : undefined,
  });

export { handler as GET, handler as POST };