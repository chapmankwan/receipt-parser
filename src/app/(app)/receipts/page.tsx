import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui";
import { ReceiptTable } from "@/components/receipts/ReceiptTable";
import Link from "next/link";

// ---------------------------------------------------------------------------
// /receipts — Server Component
//
// Renders the page shell and delegates data + interactivity to ReceiptTable.
// Keeping this a Server Component means the page title and header render
// instantly with no client JS needed.
// ---------------------------------------------------------------------------

export default function ReceiptsPage() {
  return (
    <>
      <PageHeader title="Receipts">
        <Link href="/upload">
          <Button variant="primary" size="sm">
            <i className="ti ti-upload" style={{ fontSize: 13 }} aria-hidden="true" />
            Upload receipt
          </Button>
        </Link>
      </PageHeader>
      <main className="flex-1 overflow-auto p-5">
        <ReceiptTable />
      </main>
    </>
  );
}