"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import {
  Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, TableSkeleton,
  Badge, EmptyState, Button,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// ReceiptTable — Client Component
//
// Renders a paginated, searchable table of the user's receipts.
// Clicking a row navigates to /receipts/[id].
//
// Search filters client-side against loaded receipts — for an MVP with
// hundreds of receipts this is fine. When the list grows we can push the
// filter to the server query.
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20;

export function ReceiptTable() {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");

  const { data, isLoading, isError } = trpc.receipt.listWithCounts.useQuery({
    limit:  PAGE_SIZE,
    offset,
  });

  // Client-side search against store name
  const filtered = data?.filter((r) =>
    search.trim() === "" ||
    r.store?.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const hasMore   = (data?.length ?? 0) === PAGE_SIZE;
  const hasPrev   = offset > 0;
  const pageNum   = Math.floor(offset / PAGE_SIZE) + 1;

  // ── Derived status for a receipt ─────────────────────────────────────────
  // A receipt "needs review" if it has no confirmed line items yet.
  // We don't have that count from list — so we use a simple heuristic:
  // receipts created via the upload flow are confirmed on save, so all
  // receipts in the list start as confirmed. This will be refined in F4
  // when we add per-item confirmation tracking.

  return (
    <div className="space-y-3">

      {/* Search + pagination controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <i
            className="ti ti-search absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            style={{ fontSize: 14 }}
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Search by store..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setOffset(0); }}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md outline-none focus:border-gray-400 bg-white"
          />
        </div>

        {/* Clear search */}
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            Clear
          </button>
        )}

        <div className="flex-1" />

        {/* Pagination */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={!hasPrev}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            <i className="ti ti-chevron-left" style={{ fontSize: 13 }} aria-hidden="true" />
          </Button>
          <span className="text-xs text-gray-400 tabular-nums">
            Page {pageNum}
          </span>
          <Button
            size="sm"
            disabled={!hasMore}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            <i className="ti ti-chevron-right" style={{ fontSize: 13 }} aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Table */}
      <Table>
        <TableHead>
          <TableRow>
            <TableHeader className="w-[35%]">Store</TableHeader>
            <TableHeader className="w-[15%]">Date</TableHeader>
            <TableHeader className="w-[12%]">Total</TableHeader>
            <TableHeader className="w-[10%]">Items</TableHeader>
            <TableHeader className="w-[28%]">Notes</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading && <TableSkeleton cols={5} rows={8} />}

          {isError && (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-sm text-red-500">
                Failed to load receipts. Try refreshing the page.
              </td>
            </tr>
          )}

          {!isLoading && !isError && filtered.length === 0 && (
            <tr>
              <td colSpan={5}>
                {search ? (
                  <div className="px-3 py-8 text-center text-sm text-gray-400">
                    No receipts match &ldquo;{search}&rdquo;
                  </div>
                ) : (
                  <EmptyState
                    icon="ti-receipt"
                    title="No receipts yet"
                    description="Upload your first receipt to get started"
                    action={
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => router.push("/upload")}
                      >
                        <i className="ti ti-upload" style={{ fontSize: 13 }} aria-hidden="true" />
                        Upload receipt
                      </Button>
                    }
                  />
                )}
              </td>
            </tr>
          )}

          {!isLoading && filtered.map((receipt) => (
            <TableRow
              key={receipt.id}
              onClick={() => router.push(`/receipts/${receipt.id}`)}
            >
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] text-gray-800 truncate">
                    {receipt.store?.name ?? (
                      <span className="text-gray-400 italic">Unknown store</span>
                    )}
                  </span>
                  {receipt.store?.chain && receipt.store.chain !== receipt.store.name && (
                    <span className="text-[11px] text-gray-400">
                      {receipt.store.chain}
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell muted>{receipt.purchasedOn}</TableCell>
              <TableCell>
                <span className="tabular-nums font-medium text-gray-800">
                  {receipt.currency} ${Number(receipt.total).toFixed(2)}
                </span>
              </TableCell>
              <TableCell muted>
                <span className="tabular-nums">{receipt.totalCount}</span>
                {receipt.needsReview && (
                  <span className="ml-1.5 text-[11px] text-amber-600">
                    ⚠ review
                  </span>
                )}
              </TableCell>
              <TableCell muted>
                {receipt.notes ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Result count */}
      {!isLoading && data && (
        <p className="text-xs text-gray-400 text-right tabular-nums">
          {search
            ? `${filtered.length} of ${data.length} receipts`
            : `${data.length} receipt${data.length !== 1 ? "s" : ""}`
          }
        </p>
      )}
    </div>
  );
}