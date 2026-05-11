// ---------------------------------------------------------------------------
// Table primitives
//
// Thin wrappers that apply consistent styling. Use like native HTML:
//
//   <Table>
//     <TableHead>
//       <TableRow>
//         <TableHeader>Store</TableHeader>
//         <TableHeader>Date</TableHeader>
//       </TableRow>
//     </TableHead>
//     <TableBody>
//       <TableRow onClick={() => router.push(`/receipts/${id}`)}>
//         <TableCell>Costco</TableCell>
//         <TableCell muted>2026-04-29</TableCell>
//       </TableRow>
//     </TableBody>
//   </Table>
// ---------------------------------------------------------------------------

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <table className="w-full table-fixed border-collapse text-sm">
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-gray-50 border-b border-gray-100">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-gray-50">{children}</tbody>;
}

export function TableRow({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={[
        "transition-colors",
        onClick ? "cursor-pointer hover:bg-gray-50" : "",
        className,
      ].join(" ")}
    >
      {children}
    </tr>
  );
}

export function TableHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={[
        "px-3 py-2 text-left text-[11px] font-medium text-gray-400",
        "uppercase tracking-wide",
        className,
      ].join(" ")}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  muted = false,
  className = "",
}: {
  children: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={[
        "px-3 py-2 text-[13px] truncate",
        muted ? "text-gray-400" : "text-gray-800",
        className,
      ].join(" ")}
    >
      {children}
    </td>
  );
}