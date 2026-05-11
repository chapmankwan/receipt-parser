// ---------------------------------------------------------------------------
// PageHeader
//
// Consistent top bar for every page inside the app shell.
// Usage:
//   <PageHeader title="Receipts">
//     <button>Upload receipt</button>
//   </PageHeader>
// ---------------------------------------------------------------------------

export function PageHeader({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex items-center gap-3 h-11 px-5 bg-white border-b border-gray-100 shrink-0">
      <h1 className="flex-1 text-sm font-medium text-gray-900">{title}</h1>
      {children}
    </header>
  );
}