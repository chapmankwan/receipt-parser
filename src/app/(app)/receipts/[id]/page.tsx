import { PageHeader } from "@/components/layout/PageHeader";
import { ReceiptDetail } from "@/components/receipts/ReceiptDetail";
import { BackButton } from "@/components/layout/BackButton";

// ---------------------------------------------------------------------------
// /receipts/[id] — Server Component
//
// Renders the page shell. ReceiptDetail handles data fetching and editing.
// ---------------------------------------------------------------------------

export default async function ReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <>
      <PageHeader title="Receipt">
        <BackButton href="/receipts" label="All receipts" />
      </PageHeader>
      <main className="flex-1 overflow-auto p-5">
        <ReceiptDetail id={id} />
      </main>
    </>
  );
}