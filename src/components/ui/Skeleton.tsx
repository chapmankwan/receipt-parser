// ---------------------------------------------------------------------------
// Skeleton
//
// Placeholder shimmer shown while data is loading.
// Matches the visual structure of the real content so the layout doesn't jump.
//
// Usage — table rows:
//   <TableSkeleton cols={5} rows={8} />
//
// Usage — single line:
//   <Skeleton className="w-32 h-4" />
// ---------------------------------------------------------------------------

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={["rounded bg-gray-100 animate-pulse", className].join(" ")}
      style={style}
    />
  );
}

export function TableSkeleton({
  cols = 4,
  rows = 6,
}: {
  cols?: number;
  rows?: number;
}) {
  // Vary widths per column so it doesn't look like a grid of identical blocks
  const widths = ["70%", "60%", "50%", "55%", "45%", "65%"];

  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <tr key={rowIdx} className="border-t border-gray-50">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <td key={colIdx} className="px-3 py-2.5">
              <Skeleton
                className="h-3"
                style={
                  { width: widths[(rowIdx + colIdx) % widths.length] } as React.CSSProperties
                }
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}