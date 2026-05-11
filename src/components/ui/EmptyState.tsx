// ---------------------------------------------------------------------------
// EmptyState
//
// Shown when a list has no items. Centered, minimal, with an optional CTA.
//
// Usage:
//   <EmptyState
//     icon="ti-receipt"
//     title="No receipts yet"
//     description="Upload your first receipt to get started"
//     action={<Button onClick={() => router.push("/upload")}>Upload receipt</Button>}
//   />
// ---------------------------------------------------------------------------

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <i
        className={`ti ${icon} text-gray-300`}
        style={{ fontSize: 36 }}
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {description && (
          <p className="text-xs text-gray-400">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}