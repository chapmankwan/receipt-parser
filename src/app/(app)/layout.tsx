import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { AppSidebar } from "@/components/layout/AppSidebar";

// ---------------------------------------------------------------------------
// Authenticated app layout
//
// Wraps every page inside (app)/ with:
//   1. A server-side auth check — unauthenticated users go to /sign-in
//   2. The sidebar + main content shell
//
// Using a route group (app) means these pages share this layout without
// affecting the URL structure. /receipts stays /receipts, not /app/receipts.
// ---------------------------------------------------------------------------

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}