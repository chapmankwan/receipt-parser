"use client";

import Link from "next/link";

export function BackButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
    >
      <i className="ti ti-chevron-left" style={{ fontSize: 13 }} aria-hidden="true" />
      {label}
    </Link>
  );
}