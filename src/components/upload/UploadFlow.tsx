"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui";
import type { ParsedReceipt, ParsedLineItem } from "@/server/lib/receiptParser";

// ---------------------------------------------------------------------------
// UploadFlow — three-step receipt upload UI
//
// Step 1 — PICK:    file/camera picker with drag-and-drop
// Step 2 — PARSE:   upload in progress + parsing loading state
// Step 3 — REVIEW:  editable table of parsed items, confirm to save
// ---------------------------------------------------------------------------

type Step = "pick" | "parse" | "review";

// Editable version of a parsed line item — tracks local edits before save
type DraftItem = ParsedLineItem & { _edited: boolean };

export function UploadFlow() {
  const router   = useRouter();
  const fileRef  = useRef<HTMLInputElement>(null);

  const [step,    setStep]    = useState<Step>("pick");
  const [error,   setError]   = useState<string | null>(null);
  const [status,  setStatus]  = useState<string>("");
  const [parsed,  setParsed]  = useState<ParsedReceipt | null>(null);
  const [items,   setItems]   = useState<DraftItem[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const parseMutation  = trpc.receipt.parse.useMutation();
  const createMutation = trpc.receipt.create.useMutation();

  // ── File handling ─────────────────────────────────────────────────────────

  async function handleFile(file: File) {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB.");
      return;
    }

    setError(null);
    setStep("parse");
    setStatus("Uploading image...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res  = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json() as { path?: string; error?: string };
      if (!res.ok || !json.path) throw new Error(json.error ?? "Upload failed");

      setStatus("Reading receipt...");

      const result = await parseMutation.mutateAsync({
        storagePath: json.path,
        mimeType:    file.type as "image/jpeg" | "image/png" | "image/webp",
      });

      setParsed(result);
      setItems(result.lineItems.map((item) => ({ ...item, _edited: false })));
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("pick");
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void handleFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) void handleFile(file);
  }

  // ── Item editing ──────────────────────────────────────────────────────────

  function updateItem(index: number, patch: Partial<DraftItem>) {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, ...patch, _edited: true } : item
      )
    );
  }

  // ── Confirm + save ────────────────────────────────────────────────────────

  async function handleConfirm() {
    if (!parsed) return;

    try {
      const result = await createMutation.mutateAsync({
        store: {
          name:     parsed.storeName     ?? "Unknown Store",
          chain:    parsed.storeChain,
          location: parsed.storeLocation,
        },
        purchasedOn: parsed.purchasedOn ?? new Date().toISOString().split("T")[0]!,
        subtotal:    parsed.subtotal,
        tax:         parsed.tax,
        total:       parsed.total,
        currency:    parsed.currency,
        notes:       null,
        lineItems:   items.map((item) => ({
          rawName:      item.rawName,
          resolvedName: item.resolvedName,
          quantityType: item.quantityType,
          quantity:     item.quantity,
          weightUnit:   item.weightUnit,
          unitPrice:    item.unitPrice,
          totalPrice:   item.totalPrice,
          categoryName: item.suggestedCategory,
        })),
      });

      router.push(`/receipts/${result.receiptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save receipt");
    }
  }

  function reset() {
    setStep("pick");
    setParsed(null);
    setItems([]);
    setError(null);
    setStatus("");
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl">
      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <i className="ti ti-alert-circle" style={{ fontSize: 15 }} aria-hidden="true" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <i className="ti ti-x" style={{ fontSize: 13 }} aria-hidden="true" />
          </button>
        </div>
      )}

      {step === "pick"  && <PickStep  fileRef={fileRef} dragOver={dragOver} setDragOver={setDragOver} onDrop={handleDrop} onInputChange={handleInputChange} />}
      {step === "parse" && <ParseStep status={status} />}
      {step === "review" && parsed && (
        <ReviewStep
          parsed={parsed}
          items={items}
          onUpdateItem={updateItem}
          onConfirm={handleConfirm}
          onReset={reset}
          isSaving={createMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Step 1: Pick ─────────────────────────────────────────────────────────────

function PickStep({
  fileRef,
  dragOver,
  setDragOver,
  onDrop,
  onInputChange,
}: {
  fileRef: React.RefObject<HTMLInputElement | null>;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => fileRef.current?.click()}
      className={[
        "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed",
        "cursor-pointer transition-colors py-20 px-8 text-center select-none",
        dragOver
          ? "border-gray-400 bg-gray-50"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50",
      ].join(" ")}
    >
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
        <i className="ti ti-camera text-gray-400" style={{ fontSize: 28 }} aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-700">
          Drop a receipt photo here
        </p>
        <p className="text-xs text-gray-400">
          or click to browse — JPEG, PNG, WebP up to 10MB
        </p>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={onInputChange}
        className="hidden"
      />
    </div>
  );
}

// ── Step 2: Parse ─────────────────────────────────────────────────────────────

function ParseStep({ status }: { status: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20">
      {/* Spinner */}
      <div className="w-12 h-12 rounded-full border-2 border-gray-200 border-t-gray-600 animate-spin" />
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-gray-700">{status}</p>
        <p className="text-xs text-gray-400">This usually takes a few seconds</p>
      </div>
    </div>
  );
}

// ── Step 3: Review ────────────────────────────────────────────────────────────

function ReviewStep({
  parsed,
  items,
  onUpdateItem,
  onConfirm,
  onReset,
  isSaving,
}: {
  parsed: ParsedReceipt;
  items: DraftItem[];
  onUpdateItem: (index: number, patch: Partial<DraftItem>) => void;
  onConfirm: () => void;
  onReset: () => void;
  isSaving: boolean;
}) {
  const editedCount      = items.filter((i) => i._edited).length;
  const needsReviewCount = items.filter((i) => i.needsReview && !i._edited).length;

  // Discrepancy check — same logic as ReceiptDetail
  const lineItemsSum   = items.reduce((sum, i) => sum + i.totalPrice, 0);
  const receiptTotal   = parsed.total;
  const discrepancy    = Math.abs(lineItemsSum - receiptTotal);
  const hasDiscrepancy = discrepancy > 0.02;

  return (
    <div className="space-y-4">

      {/* Receipt summary */}
      <div className="rounded-lg border border-gray-100 bg-white p-4 flex flex-wrap gap-x-8 gap-y-1.5 text-sm">
        <SummaryField label="Store"   value={parsed.storeName ?? "Unknown"} />
        <SummaryField label="Date"    value={parsed.purchasedOn ?? "—"} />
        <SummaryField label="Total"   value={`${parsed.currency} $${parsed.total.toFixed(2)}`} bold />
        {parsed.tax      && <SummaryField label="Tax"      value={`$${parsed.tax.toFixed(2)}`} />}
        {parsed.subtotal && <SummaryField label="Subtotal" value={`$${parsed.subtotal.toFixed(2)}`} />}
      </div>

      {/* Banners */}
      {parsed.lowConfidence && (
        <Banner variant="amber" icon="ti-eye-off">
          Low confidence parse — {parsed.lowConfidenceReason ?? "review all items carefully before confirming."}
        </Banner>
      )}
      {needsReviewCount > 0 && (
        <Banner variant="amber" icon="ti-alert-triangle">
          {needsReviewCount} item{needsReviewCount > 1 ? "s" : ""} flagged for review — check the highlighted rows.
        </Banner>
      )}
      {hasDiscrepancy && (
        <Banner variant="red" icon="ti-calculator">
          Line items total <strong>${lineItemsSum.toFixed(2)}</strong> doesn&apos;t match
          receipt total <strong>${receiptTotal.toFixed(2)}</strong> (difference: ${discrepancy.toFixed(2)}).
        </Banner>
      )}

      {/* Line items table */}
      <div className="rounded-lg border border-gray-100 overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Raw name", "Item name", "Type", "Qty", "Unit $", "Total", "Category", ""].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {items.map((item, i) => (
              <ReviewRow
                key={i}
                item={item}
                index={i}
                onUpdate={onUpdateItem}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <Button variant="secondary" onClick={onReset} disabled={isSaving}>
          <i className="ti ti-arrow-left" style={{ fontSize: 13 }} aria-hidden="true" />
          Start over
        </Button>

        <div className="flex items-center gap-3">
          {editedCount > 0 && (
            <span className="text-xs text-gray-400">
              {editedCount} item{editedCount > 1 ? "s" : ""} edited
            </span>
          )}
          <Button variant="primary" onClick={onConfirm} disabled={isSaving}>
            {isSaving ? (
              <>
                <span className="w-3 h-3 rounded-full border border-white border-t-transparent animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <i className="ti ti-check" style={{ fontSize: 13 }} aria-hidden="true" />
                Confirm and save
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── ReviewRow ─────────────────────────────────────────────────────────────────

function ReviewRow({
  item,
  index,
  onUpdate,
}: {
  item: DraftItem;
  index: number;
  onUpdate: (index: number, patch: Partial<DraftItem>) => void;
}) {
  const rowBg = item.needsReview && !item._edited
    ? "bg-amber-50/60"
    : item._edited
    ? "bg-blue-50/40"
    : undefined;

  function inp(
    value: string | number,
    field: keyof DraftItem,
    type = "text",
    width = "w-full"
  ) {
    return (
      <input
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(e) => {
          const v = type === "number" ? parseFloat(e.target.value) : e.target.value;
          onUpdate(index, { [field]: v });
        }}
        className={[
          width,
          "text-[13px] px-1.5 py-0.5 border border-gray-200 rounded",
          "focus:border-blue-300 focus:outline-none bg-white",
          item._edited ? "border-blue-200" : "",
        ].join(" ")}
      />
    );
  }

  return (
    <tr className={rowBg}>
      {/* Raw name — read only */}
      <td className="px-3 py-1.5">
        <span className="text-[11px] text-gray-400 truncate block max-w-[120px]">
          {item.rawName}
        </span>
      </td>

      {/* Resolved name */}
      <td className="px-3 py-1.5">{inp(item.resolvedName, "resolvedName")}</td>

      {/* Quantity type */}
      <td className="px-3 py-1.5">
        <select
          value={item.quantityType}
          onChange={(e) => onUpdate(index, { quantityType: e.target.value as "unit" | "weight" })}
          className="text-[13px] px-1.5 py-0.5 border border-gray-200 rounded focus:border-blue-300 focus:outline-none bg-white"
        >
          <option value="unit">unit</option>
          <option value="weight">weight</option>
        </select>
      </td>

      {/* Quantity + weight unit */}
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-1">
          {inp(item.quantity, "quantity", "number", "w-16")}
          {item.quantityType === "weight" && (
            <select
              value={item.weightUnit ?? "lb"}
              onChange={(e) => onUpdate(index, { weightUnit: e.target.value as "lb" | "kg" | "oz" | "g" })}
              className="text-[13px] px-1 py-0.5 border border-gray-200 rounded focus:border-blue-300 focus:outline-none bg-white"
            >
              {["lb", "kg", "oz", "g"].map((u) => <option key={u}>{u}</option>)}
            </select>
          )}
        </div>
      </td>

      {/* Unit price */}
      <td className="px-3 py-1.5">{inp(Number(item.unitPrice).toFixed(2), "unitPrice", "number", "w-20")}</td>

      {/* Total price */}
      <td className="px-3 py-1.5">{inp(Number(item.totalPrice).toFixed(2), "totalPrice", "number", "w-20")}</td>

      {/* Category */}
      <td className="px-3 py-1.5">
        {inp(item.suggestedCategory ?? "", "suggestedCategory")}
      </td>

      {/* Status */}
      <td className="px-3 py-1.5 text-center">
        {item._edited ? (
          <span className="text-[11px] text-blue-500">✏</span>
        ) : item.needsReview ? (
          <span className="text-[11px] text-amber-500" title={item.reviewReason ?? ""}>⚠</span>
        ) : (
          <span className="text-[11px] text-gray-300">✓</span>
        )}
      </td>
    </tr>
  );
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function SummaryField({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-gray-400 w-14 shrink-0">{label}</span>
      <span className={bold ? "font-semibold text-gray-900" : "text-gray-700"}>
        {value}
      </span>
    </div>
  );
}

function Banner({
  variant,
  icon,
  children,
}: {
  variant: "amber" | "red";
  icon: string;
  children: React.ReactNode;
}) {
  const styles = {
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red:   "border-red-200   bg-red-50   text-red-800",
  };
  return (
    <div className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${styles[variant]}`}>
      <i className={`ti ${icon} mt-0.5 shrink-0`} style={{ fontSize: 15 }} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}