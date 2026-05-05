"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { trpc } from "./client";

// ---------------------------------------------------------------------------
// TRPCProvider
//
// Wraps the app with both the tRPC client and React Query's QueryClient.
// Add this to your root layout inside <ClerkProvider>:
//
//   <ClerkProvider>
//     <TRPCProvider>
//       {children}
//     </TRPCProvider>
//   </ClerkProvider>
//
// httpBatchLink automatically batches multiple tRPC calls made in the same
// render tick into a single HTTP request — free performance, no code changes.
// ---------------------------------------------------------------------------

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000, // 30s — data stays fresh for 30 seconds
            retry: 1,
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: "/api/trpc",
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}