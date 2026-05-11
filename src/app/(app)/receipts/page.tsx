"use client";
import { PageHeader } from "@/components/layout/PageHeader";
import { Table, TableHead, TableBody, TableRow,
         TableHeader, TableCell, TableSkeleton } from "@/components/ui";
import { Badge }        from "@/components/ui";
import { EmptyState }   from "@/components/ui";
import { EditableCell } from "@/components/ui";
import { Button }       from "@/components/ui";

export default function ReceiptsPage() {
  return (
    <>
      <PageHeader title="Receipts">
        <Button variant="primary" size="sm">
          <i className="ti ti-upload" style={{ fontSize: 13 }} />
          Upload
        </Button>
      </PageHeader>
      <main className="flex-1 overflow-auto p-5 space-y-6">

        <Table>
          <TableHead>
            <TableRow>
              <TableHeader>Store</TableHeader>
              <TableHeader>Date</TableHeader>
              <TableHeader>Total</TableHeader>
              <TableHeader>Status</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow onClick={() => alert("navigate to receipt")}>
              <TableCell>Real Canadian Superstore</TableCell>
              <TableCell muted>2026-04-29</TableCell>
              <TableCell>$23.24</TableCell>
              <TableCell><Badge variant="confirmed">confirmed</Badge></TableCell>
            </TableRow>
            <TableRow onClick={() => alert("navigate to receipt")}>
              <TableCell>Costco Burnaby</TableCell>
              <TableCell muted>2026-04-22</TableCell>
              <TableCell>$147.83</TableCell>
              <TableCell><Badge variant="review">needs review</Badge></TableCell>
            </TableRow>
            <TableSkeleton cols={4} rows={3} />
          </TableBody>
        </Table>

        <EditableCell
          value="Organic Bananas"
          onSave={(v) => alert("saved: " + v)}
        />

        <EmptyState
          icon="ti-receipt"
          title="No receipts yet"
          description="Upload your first receipt to get started"
        />

      </main>
    </>
  );
}