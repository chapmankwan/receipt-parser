"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";

// ---------------------------------------------------------------------------
// Navigation items
// Add new routes here — the active state is handled automatically.
// ---------------------------------------------------------------------------

const NAV_ITEMS = [
  { href: "/receipts", icon: "ti-receipt",        label: "Receipts" },
  { href: "/upload",   icon: "ti-upload",          label: "Upload"   },
] as const;

const MANAGE_ITEMS = [
  { href: "/stores",     icon: "ti-building-store", label: "Stores"     },
  { href: "/categories", icon: "ti-tag",             label: "Categories" },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();
  const { user }    = useUser();

  const initials = [
    user?.firstName?.[0],
    user?.lastName?.[0],
  ]
    .filter(Boolean)
    .join("")
    .toUpperCase() || "?";

  const email = user?.emailAddresses[0]?.emailAddress ?? "";

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <aside className="flex flex-col w-48 shrink-0 bg-white border-r border-gray-100 h-full">

      {/* App name */}
      <div className="px-4 py-4 border-b border-gray-100">
        <p className="text-sm font-medium text-gray-900">Receipt tracker</p>
        <p className="text-xs text-gray-400 mt-0.5">Personal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={isActive(item.href)}
          />
        ))}

        <p className="px-4 pt-3 pb-1 text-[11px] uppercase tracking-wide text-gray-400">
          Manage
        </p>

        {MANAGE_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            {...item}
            active={isActive(item.href)}
          />
        ))}
      </nav>

      {/* User row */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-[11px] font-medium text-blue-700 shrink-0">
            {initials}
          </div>
          <span className="text-xs text-gray-500 flex-1 min-w-0 truncate">
            {email}
          </span>
          <button
            onClick={() => void signOut({ redirectUrl: "/sign-in" })}
            aria-label="Sign out"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <i className="ti ti-logout" style={{ fontSize: 14 }} aria-hidden="true" />
          </button>
        </div>
      </div>

    </aside>
  );
}

// ── NavItem ─────────────────────────────────────────────────────────────────

function NavItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "flex items-center gap-2 px-4 py-1.5 text-sm transition-colors",
        active
          ? "bg-gray-100 text-gray-900 font-medium"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-800",
      ].join(" ")}
    >
      <i className={`ti ${icon}`} style={{ fontSize: 16 }} aria-hidden="true" />
      {label}
    </Link>
  );
}