// ---------------------------------------------------------------------------
// Badge
//
// Small colored pill for status, category, and type labels.
// Variant drives the color — pick the one that matches the semantic meaning.
//
// Usage:
//   <Badge variant="confirmed">confirmed</Badge>
//   <Badge variant="category">Produce</Badge>
// ---------------------------------------------------------------------------

type BadgeVariant =
  | "confirmed"    // teal  — item reviewed and accepted
  | "review"       // amber — item needs user attention
  | "weight"       // coral — quantity type: weight
  | "unit"         // gray  — quantity type: unit
  | "category"     // purple — category tag
  | "default";     // gray  — fallback

const STYLES: Record<BadgeVariant, string> = {
  confirmed: "bg-teal-50  text-teal-800",
  review:    "bg-amber-50 text-amber-800",
  weight:    "bg-red-50   text-red-700",
  unit:      "bg-gray-100 text-gray-600",
  category:  "bg-purple-50 text-purple-800",
  default:   "bg-gray-100 text-gray-600",
};

export function Badge({
  variant = "default",
  children,
}: {
  variant?: BadgeVariant;
  children: React.ReactNode;
}) {
  return (
    <span
      className={[
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium",
        STYLES[variant],
      ].join(" ")}
    >
      {children}
    </span>
  );
}