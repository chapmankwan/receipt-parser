"use client";

import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@/server/root";

// ---------------------------------------------------------------------------
// tRPC React client
//
// Import `trpc` in any Client Component to call backend procedures:
//
//   const { data } = trpc.health.ping.useQuery();
//   const create   = trpc.receipt.create.useMutation();
//
// Types flow automatically from AppRouter — full autocomplete, and TypeScript
// will error if you pass the wrong input shape.
// ---------------------------------------------------------------------------

export const trpc = createTRPCReact<AppRouter>();