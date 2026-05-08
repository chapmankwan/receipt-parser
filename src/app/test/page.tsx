"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import type { ParsedReceipt, ParsedLineItem } from "@/server/lib/receiptParser";

// ---------------------------------------------------------------------------
// Editable line item — local state only, changes sent on confirm
// ---------------------------------------------------------------------------

type EditableItem = ParsedLineItem & { _edited?: boolean };

function LineItemRow({
  item,
  index,
  onChange,
}: {
  item: EditableItem;
  index: number;
  onChange: (index: number, updated: Partial<EditableItem>) => void;
}) {
  const inp = (
    value: string | number,
    field: keyof EditableItem,
    type = "text",
    width = 120
  ) => (
    <input
      type={type}
      value={value}
      step={type === "number" ? "0.01" : undefined}
      onChange={(e) => {
        const v = type === "number" ? parseFloat(e.target.value) : e.target.value;
        onChange(index, { [field]: v, _edited: true });
      }}
      style={{
        width,
        padding: "3px 6px",
        fontSize: 12,
        border: "1px solid #ddd",
        borderRadius: 4,
        background: item._edited ? "pink" : "grey",
      }}
    />
  );

  return (
    <tr style={{ background: item.needsReview && !item._edited ? "grey" : undefined }}>
      <td style={td}><span style={{ fontSize: 11, color: "#999" }}>{item.rawName}</span></td>
      <td style={td}>{inp(item.resolvedName, "resolvedName", "text", 160)}</td>
      <td style={td}>
        <select
          value={item.quantityType}
          onChange={(e) => onChange(index, { quantityType: e.target.value as "unit" | "weight", _edited: true })}
          style={{ fontSize: 12, padding: "3px 6px", border: "1px solid #ddd", borderRadius: 4 }}
        >
          <option value="unit">unit</option>
          <option value="weight">weight</option>
        </select>
      </td>
      <td style={td}>
        {inp(item.quantity, "quantity", "number", 70)}
        {item.quantityType === "weight" && (
          <select
            value={item.weightUnit ?? "lb"}
            onChange={(e) => onChange(index, { weightUnit: e.target.value as "lb" | "kg" | "oz" | "g", _edited: true })}
            style={{ marginLeft: 4, fontSize: 12, padding: "3px 4px", border: "1px solid #ddd", borderRadius: 4 }}
          >
            {["lb","kg","oz","g"].map((u) => <option key={u}>{u}</option>)}
          </select>
        )}
      </td>
      <td style={td}>{inp(item.unitPrice,  "unitPrice",  "number", 70)}</td>
      <td style={td}>{inp(item.totalPrice, "totalPrice", "number", 70)}</td>
      <td style={td}>{inp(item.suggestedCategory ?? "", "suggestedCategory", "text", 100)}</td>
      <td style={td}>
        {item._edited
          ? <span style={{ color: "#27ae60", fontSize: 11 }}>✏ edited</span>
          : item.needsReview
          ? <span style={{ color: "#e67e22", fontSize: 11 }}>⚠ review</span>
          : <span style={{ color: "#aaa",     fontSize: 11 }}>✓</span>
        }
      </td>
    </tr>
  );
}

// ── Saved receipt editor ──────────────────────────────────────────────────

function SavedReceiptEditor() {
  const [receiptId, setReceiptId] = useState("");
  const [searched,  setSearched]  = useState(false);

  const { data: receipt, refetch } = trpc.receipt.byId.useQuery(
    { id: receiptId },
    { enabled: false }
  );

  const updateLineItem = trpc.receipt.updateLineItem.useMutation({
    onSuccess: () => refetch(),
  });

  const [editing, setEditing] = useState<Record<string, Partial<{
    resolvedName: string;
    categoryName: string | null;
    quantityType: "unit" | "weight";
    quantity: number;
    weightUnit: "lb" | "kg" | "oz" | "g" | null;
    unitPrice: number;
    totalPrice: number;
  }>>>({});

  function handleSearch() {
    if (receiptId.length < 10) return;
    setSearched(true);
    void refetch();
  }

  function handleSaveItem(lineItemId: string) {
    const changes = editing[lineItemId];
    if (!changes) return;
    updateLineItem.mutate({ lineItemId, ...changes });
    setEditing((prev) => { const n = { ...prev }; delete n[lineItemId]; return n; });
  }

  return (
    <div style={{ marginTop: 40, borderTop: "1px solid #eee", paddingTop: 24 }}>
      <h3>Edit a saved receipt</h3>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          placeholder="Paste a receipt ID"
          value={receiptId}
          onChange={(e) => setReceiptId(e.target.value)}
          style={{ flex: 1, padding: "6px 10px", fontSize: 13, border: "1px solid #ddd", borderRadius: 4 }}
        />
        <button onClick={handleSearch} style={btnStyle("#3498db")}>Load</button>
      </div>

      {searched && !receipt && <p style={{ color: "#999", fontSize: 13 }}>No receipt found.</p>}

      {receipt && (
        <div>
          <p style={{ fontSize: 13, marginBottom: 12 }}>
            <strong>{receipt.store?.name ?? "Unknown store"}</strong> —{" "}
            {receipt.purchasedOn} — {receipt.currency} ${receipt.total}
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "lightblue" }}>
                {["Raw","Resolved name","Type","Qty","Unit $","Total","Category","Status","Save"].map((h) => (
                  <th key={h} style={{ ...td, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {receipt.lineItems.map((item) => {
                const draft = editing[item.id] ?? {};
                const inpS = (
                  field: string,
                  value: string | number,
                  type = "text",
                  width = 110
                ) => (
                  <input
                    type={type}
                    step={type === "number" ? "0.01" : undefined}
                    value={value}
                    onChange={(e) => {
                      const v = type === "number" ? parseFloat(e.target.value) : e.target.value;
                      setEditing((prev) => ({ ...prev, [item.id]: { ...prev[item.id], [field]: v } }));
                    }}
                    style={{ width, padding: "3px 6px", fontSize: 12, border: "1px solid #ddd", borderRadius: 4, background: draft[field as keyof typeof draft] !== undefined ? "#fffde7" : "lightgrey" }}
                  />
                );

                return (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                    <td style={td}><span style={{ fontSize: 10, color: "#999" }}>{item.rawName}</span></td>
                    <td style={td}>{inpS("resolvedName", draft.resolvedName ?? item.resolvedName)}</td>
                    <td style={td}>
                      <select
                        value={draft.quantityType ?? item.quantityType}
                        onChange={(e) => setEditing((prev) => ({ ...prev, [item.id]: { ...prev[item.id], quantityType: e.target.value as "unit" | "weight" } }))}
                        style={{ fontSize: 12, padding: "3px 4px", border: "1px solid #ddd", borderRadius: 4 }}
                      >
                        <option value="unit">unit</option>
                        <option value="weight">weight</option>
                      </select>
                    </td>
                    <td style={td}>{inpS("quantity", draft.quantity ?? Number(item.quantity), "number", 70)}</td>
                    <td style={td}>{inpS("unitPrice", draft.unitPrice ?? Number(item.unitPrice), "number", 70)}</td>
                    <td style={td}>{inpS("totalPrice", draft.totalPrice ?? Number(item.totalPrice), "number", 70)}</td>
                    <td style={td}>{inpS("categoryName", draft.categoryName ?? item.category?.name ?? "")}</td>
                    <td style={td}>
                      {item.userConfirmed
                        ? <span style={{ color: "#27ae60", fontSize: 11 }}>✓ confirmed</span>
                        : <span style={{ color: "#e67e22", fontSize: 11 }}>⚠ unconfirmed</span>
                      }
                    </td>
                    <td style={td}>
                      {Object.keys(draft).length > 0 && (
                        <button
                          onClick={() => handleSaveItem(item.id)}
                          style={btnStyle("#27ae60", 12)}
                        >
                          Save
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────

const td: React.CSSProperties = {
  padding: "6px 8px",
  borderBottom: "1px solid #eee",
  verticalAlign: "middle",
};

function btnStyle(bg: string, fontSize = 13): React.CSSProperties {
  return {
    padding: "6px 14px",
    background: bg,
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize,
  };
}

// ── Main page ─────────────────────────────────────────────────────────────

export default function TestPage() {
  const [step, setStep]       = useState<"upload" | "review" | "done">("upload");
  const [items, setItems]     = useState<EditableItem[]>([]);
  const [parsed, setParsed]   = useState<ParsedReceipt | null>(null);
  const [output, setOutput]   = useState<string>("");
  const [loading, setLoading] = useState(false);

  const parseMutation  = trpc.receipt.parse.useMutation();
  const createMutation = trpc.receipt.create.useMutation();

  function handleItemChange(index: number, updated: Partial<EditableItem>) {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, ...updated } : item));
  }

  // ── Step 1: upload + parse ───────────────────────────────────────────────

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setOutput("Uploading...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res  = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json() as { path?: string; error?: string };
      if (!res.ok || !json.path) throw new Error(json.error ?? "Upload failed");

      setOutput("Parsing receipt...");

      const result = await parseMutation.mutateAsync({
        storagePath: json.path,
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
      });

      setParsed(result);
      setItems(result.lineItems.map((item) => ({ ...item, _edited: false })));
      setStep("review");
      setOutput("");
    } catch (err) {
      setOutput(`ERROR: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: confirm + save ────────────────────────────────────────────────

  async function handleConfirm() {
    if (!parsed) return;
    setLoading(true);

    try {
      const result = await createMutation.mutateAsync({
        store: {
          name:     parsed.storeName     ?? "Unknown Store",
          chain:    parsed.storeChain,
          location: parsed.storeLocation,
        },
        purchasedOn: parsed.purchasedOn ?? new Date().toISOString().split("T")[0]!,
        subtotal: parsed.subtotal,
        tax:      parsed.tax,
        total:    parsed.total,
        currency: parsed.currency,
        notes:    null,
        // Use edited items — not the original parsed items
        lineItems: items.map((item) => ({
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

      setOutput(JSON.stringify(result, null, 2));
      setStep("done");
    } catch (err) {
      setOutput(`ERROR: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const editedCount     = items.filter((i) => i._edited).length;
  const needsReviewCount = items.filter((i) => i.needsReview && !i._edited).length;

  return (
    <div style={{ padding: 32, fontFamily: "monospace", maxWidth: 1100 }}>
      <h2>Receipt parse + edit test</h2>

      {step === "upload" && (
        <div>
          <p style={{ color: "#666", fontSize: 13 }}>Upload any image — stub parser returns fake data.</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
            disabled={loading}
          />
          {loading && <p>⏳ {output}</p>}
          {!loading && output && (
            <pre style={{ background: "#fdecea", padding: 12, borderRadius: 6, fontSize: 12, marginTop: 8 }}>
              {output}
            </pre>
          )}
        </div>
      )}

      {step === "review" && parsed && (
        <div>
          <h3>
            {parsed.storeName} — {parsed.purchasedOn} —{" "}
            {parsed.currency} ${parsed.total.toFixed(2)}
          </h3>

          {needsReviewCount > 0 && (
            <p style={{ color: "#e67e22", fontSize: 13 }}>
              ⚠ {needsReviewCount} item{needsReviewCount > 1 ? "s" : ""} flagged for review — edit the highlighted rows before confirming.
            </p>
          )}
          {editedCount > 0 && (
            <p style={{ color: "#27ae60", fontSize: 13 }}>
              ✏ {editedCount} item{editedCount > 1 ? "s" : ""} edited — highlighted in yellow.
            </p>
          )}

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 16 }}>
            <thead>
              <tr style={{ background: "grey" }}>
                {["Raw (read-only)","Resolved name","Type","Qty / Weight","Unit $","Total","Category","Status"].map((h) => (
                  <th key={h} style={{ ...td, fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <LineItemRow key={i} item={item} index={i} onChange={handleItemChange} />
              ))}
            </tbody>
          </table>

          <button
            onClick={handleConfirm}
            disabled={loading}
            style={btnStyle(loading ? "#aaa" : "#2ecc71")}
          >
            {loading ? "Saving..." : `Confirm and save${editedCount > 0 ? ` (${editedCount} edited)` : ""}`}
          </button>
        </div>
      )}

      {step === "done" && (
        <div>
          <p style={{ color: "#27ae60" }}>✓ Receipt saved</p>
          <pre style={{ background: "grey", padding: 16, borderRadius: 8, fontSize: 12 }}>
            {output}
          </pre>
          <button
            onClick={() => { setStep("upload"); setParsed(null); setItems([]); setOutput(""); }}
            style={{ ...btnStyle("#95a5a6"), marginTop: 12 }}
          >
            Test another
          </button>
        </div>
      )}

      <SavedReceiptEditor />
    </div>
  );
}