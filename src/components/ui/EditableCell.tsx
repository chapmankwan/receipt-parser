"use client";

import { useState, useRef, useEffect } from "react";

type EditableCellProps = {
  value: string | number;
  onSave: (value: string) => void;
  options?: string[];
  type?: "text" | "number";
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function EditableCell({
  value,
  onSave,
  options,
  type = "text",
  placeholder,
  disabled = false,
  className = "",
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(String(value));
  const inputRef = useRef<HTMLInputElement & HTMLSelectElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function startEditing() {
    // Always initialise draft from the latest value when opening —
    // avoids the need for a sync effect to watch value changes
    setDraft(String(value));
    setEditing(true);
  }

  function handleCommit() {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== String(value)) {
      onSave(trimmed);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter")  { e.preventDefault(); handleCommit(); }
    if (e.key === "Escape") { setEditing(false); }
  }

  if (disabled) {
    return (
      <span className={["text-[13px] text-gray-400 px-1", className].join(" ")}>
        {value || placeholder}
      </span>
    );
  }

  if (!editing) {
    return (
      <button
        onClick={startEditing}
        className={[
          "group flex items-center gap-1 text-[13px] text-gray-800",
          "px-1 py-0.5 rounded hover:bg-gray-100 transition-colors text-left w-full",
          className,
        ].join(" ")}
      >
        <span className="truncate">
          {value || <span className="text-gray-400">{placeholder}</span>}
        </span>
        <i
          className="ti ti-pencil text-gray-300 group-hover:text-gray-500 shrink-0"
          style={{ fontSize: 11 }}
          aria-hidden="true"
        />
      </button>
    );
  }

  if (options) {
    return (
      <select
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
        className="w-full text-[13px] px-1 py-0.5 border border-blue-300 rounded bg-white outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    );
  }

  return (
    <input
      ref={inputRef}
      type={type}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={handleCommit}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={[
        "w-full text-[13px] px-1 py-0.5 border border-blue-300 rounded",
        "bg-white outline-none",
        className,
      ].join(" ")}
    />
  );
}