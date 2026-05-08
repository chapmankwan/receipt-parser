import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// ---------------------------------------------------------------------------
// Clerk middleware
//
// Runs on every request before it hits any route or API handler.
// We define which routes are public (no auth needed) and protect everything
// else by default.
//
// Public routes:
//   /             — landing page
//   /sign-in      — Clerk's sign-in UI
//   /sign-up      — Clerk's sign-up UI
//   /api/health   — health check endpoint (step 5)
//
// Everything else — including all /api/trpc/* routes — requires auth.
// Unauthenticated requests to protected routes are redirected to /sign-in.
// ---------------------------------------------------------------------------

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/health",
  "/api/upload",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
