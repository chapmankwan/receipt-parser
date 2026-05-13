"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import {
  Table, TableHead, TableBody, TableRow,
  TableHeader, TableCell, TableSkeleton,
  Badge, EmptyState, Button,
} from "@/components/ui";
import { EditableCell } from "@/components/ui";

// ---------------------------------------------------------------------------
// ReceiptDetail — Client Component
//
// Full receipt view with inline-editable line items.
// Displays receipt metadata at the top, then a line items table below.
//
// Editing:
//   - Click any editable cell to edit inline
//   - Commits on Enter or blur via receipt.updateLineItem
//   - userConfirmed flips to true on first edit
// ---------------------------------------------------------------------------

const WEIGHT_UNITS = ["lb", "kg", "oz", "g"];
const QTY_TYPES    = ["unit", "weight"];

export function ReceiptDetail({ id }: { id: string }) {
  const router = useRouter();
  const utils  = trpc.useUtils();

  const { data: receipt, isLoading, isError } = trpc.receipt.byId.useQuery({ id });

  const updateLineItem = trpc.receipt.updateLineItem.useMutation({
    onSuccess: () => utils.receipt.byId.invalidate({ id }),
  });

  const deleteReceipt = trpc.receipt.delete.useMutation({
    onSuccess: () => router.push("/receipts"),
  });

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-lg border border-gray-100 bg-gray-50 animate-pulse" />
        <Table>
          <TableHead>
            <TableRow>
              {["Item", "Type", "Qty", "Unit $", "Total", "Category", "Status"].map((h) => (
                <TableHeader key={h}>{h}</TableHeader>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableSkeleton cols={7} rows={5} />
          </TableBody>
        </Table>
      </div>
    );
  }

  if (isError || !receipt) {
    return (
      <EmptyState
        icon="ti-receipt-off"
        title="Receipt not found"
        description="This receipt may have been deleted or doesn't belong to your account"
        action={
          <Button onClick={() => router.push("/receipts")}>
            Back to receipts
          </Button>
        }
      />
    );
  }

  const unconfirmedCount = receipt.lineItems.filter((i) => !i.userConfirmed).length;

  // Discrepancy check
  // Sum all line item totals and compare against the receipt total.
  // We use a ±$0.02 tolerance to allow for receipt rounding differences.
  // The receipt total is the source of truth — this is a warning only.
  const lineItemsSum  = receipt.lineItems.reduce((sum, i) => sum + Number(i.totalPrice), 0);
  const receiptTotal  = Number(receipt.total);
  const discrepancy   = Math.abs(lineItemsSum - receiptTotal);
  const hasDiscrepancy = discrepancy > 0.02;

  // ── Helpers ───────────────────────────────────────────────────────────────

  type LineItemFields = Omit<Parameters<typeof updateLineItem.mutate>[0], "lineItemId">;

  function saveField(lineItemId: string, fields: LineItemFields) {
    updateLineItem.mutate({ lineItemId, ...fields });
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Receipt metadata */}
      <div className="rounded-lg border border-gray-100 bg-white p-4 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
        <MetaRow label="Store">
          {receipt.store?.name ?? <span className="text-gray-400 italic">Unknown</span>}
        </MetaRow>
        <MetaRow label="Date">{receipt.purchasedOn}</MetaRow>
        <MetaRow label="Subtotal">
          {receipt.subtotal ? `${receipt.currency} $${Number(receipt.subtotal).toFixed(2)}` : "—"}
        </MetaRow>
        <MetaRow label="Tax">
          {receipt.tax ? `${receipt.currency} $${Number(receipt.tax).toFixed(2)}` : "—"}
        </MetaRow>
        <MetaRow label="Total">
          <span className="font-semibold text-gray-900">
            {receipt.currency} ${Number(receipt.total).toFixed(2)}
          </span>
        </MetaRow>
        <MetaRow label="Notes">
          {receipt.notes ?? <span className="text-gray-400">—</span>}
        </MetaRow>
      </div>

      {/* Review banner */}
      {unconfirmedCount > 0 && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <i className="ti ti-alert-triangle" style={{ fontSize: 15 }} aria-hidden="true" />
          <span>
            {unconfirmedCount} item{unconfirmedCount > 1 ? "s" : ""} need review —
            edit the highlighted rows to confirm them.
          </span>
        </div>
      )}

      {/* Discrepancy banner */}
      {hasDiscrepancy && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <i className="ti ti-calculator" style={{ fontSize: 15 }} aria-hidden="true" />
          <span>
            Line items total{" "}
            <span className="font-medium tabular-nums">
              {receipt.currency} ${lineItemsSum.toFixed(2)}
            </span>{" "}
            doesn&apos;t match receipt total{" "}
            <span className="font-medium tabular-nums">
              {receipt.currency} ${receiptTotal.toFixed(2)}
            </span>{" "}
            — difference of{" "}
            <span className="font-medium tabular-nums">
              ${discrepancy.toFixed(2)}
            </span>.
            The receipt total is the source of truth.
          </span>
        </div>
      )}

      {/* Line items table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-medium uppercase tracking-wide text-gray-400">
            Line items
          </h2>
          <span className="text-xs text-gray-400 tabular-nums">
            {receipt.lineItems.length} item{receipt.lineItems.length !== 1 ? "s" : ""}
          </span>
        </div>

        <Table>
          <TableHead>
            <TableRow>
              <TableHeader className="w-[28%]">Item</TableHeader>
              <TableHeader className="w-[8%]">Type</TableHeader>
              <TableHeader className="w-[12%]">Qty</TableHeader>
              <TableHeader className="w-[10%]">Unit $</TableHeader>
              <TableHeader className="w-[10%]">Total</TableHeader>
              <TableHeader className="w-[14%]">Category</TableHeader>
              <TableHeader className="w-[10%]">Raw name</TableHeader>
              <TableHeader className="w-[8%]">Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {receipt.lineItems.map((item) => (
              <TableRow
                key={item.id}
                className={!item.userConfirmed ? "bg-amber-50/50" : undefined}
              >
                {/* Resolved name — editable */}
                <TableCell>
                  <EditableCell
                    value={item.resolvedName}
                    onSave={(v) => saveField(item.id, { resolvedName: v })}
                    placeholder="Item name"
                  />
                </TableCell>

                {/* Quantity type — editable select */}
                <TableCell>
                  <EditableCell
                    value={item.quantityType}
                    options={QTY_TYPES}
                    onSave={(v) =>
                      saveField(item.id, { quantityType: v as "unit" | "weight" })
                    }
                  />
                </TableCell>

                {/* Quantity — editable number + weight unit select */}
                <TableCell>
                  <div className="flex items-center gap-1">
                    <EditableCell
                      value={Number(item.quantity)}
                      type="number"
                      onSave={(v) => saveField(item.id, { quantity: parseFloat(v) })}
                      className="w-14"
                    />
                    {item.quantityType === "weight" && (
                      <EditableCell
                        value={item.weightUnit ?? "lb"}
                        options={WEIGHT_UNITS}
                        onSave={(v) =>
                          saveField(item.id, {
                            weightUnit: v as "lb" | "kg" | "oz" | "g",
                          })
                        }
                        className="w-12"
                      />
                    )}
                  </div>
                </TableCell>

                {/* Unit price — editable */}
                <TableCell>
                  <EditableCell
                    value={Number(item.unitPrice).toFixed(2)}
                    type="number"
                    onSave={(v) => saveField(item.id, { unitPrice: parseFloat(v) })}
                  />
                </TableCell>

                {/* Total price — editable */}
                <TableCell>
                  <EditableCell
                    value={Number(item.totalPrice).toFixed(2)}
                    type="number"
                    onSave={(v) => saveField(item.id, { totalPrice: parseFloat(v) })}
                  />
                </TableCell>

                {/* Category — editable */}
                <TableCell>
                  <EditableCell
                    value={item.category?.name ?? ""}
                    placeholder="Add category"
                    onSave={(v) =>
                      saveField(item.id, { categoryName: v || null })
                    }
                  />
                </TableCell>

                {/* Raw name — read only */}
                <TableCell muted>
                  <span className="text-[11px]">{item.rawName}</span>
                </TableCell>

                {/* Confirmed status */}
                <TableCell>
                  {item.userConfirmed ? (
                    <Badge variant="confirmed">✓</Badge>
                  ) : (
                    <Badge variant="review">review</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Danger zone */}
      <div className="flex justify-end pt-2 border-t border-gray-100">
        <Button
          variant="danger"
          size="sm"
          onClick={() => {
            if (confirm("Delete this receipt and all its items? This cannot be undone.")) {
              deleteReceipt.mutate({ id });
            }
          }}
          disabled={deleteReceipt.isPending}
        >
          <i className="ti ti-trash" style={{ fontSize: 13 }} aria-hidden="true" />
          {deleteReceipt.isPending ? "Deleting..." : "Delete receipt"}
        </Button>
      </div>

    </div>
  );
}

// ── MetaRow ──────────────────────────────────────────────────────────────────

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-gray-400 w-16 shrink-0">{label}</span>
      <span className="text-sm text-gray-700">{children}</span>
    </div>
  );
}