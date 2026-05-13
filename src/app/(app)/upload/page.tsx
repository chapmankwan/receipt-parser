import { PageHeader } from "@/components/layout/PageHeader";
import { UploadFlow } from "@/components/upload/UploadFlow";

// ---------------------------------------------------------------------------
// /upload — Server Component shell
// UploadFlow handles all state and interactivity client-side.
// ---------------------------------------------------------------------------

export default function UploadPage() {
  return (
    <>
      <PageHeader title="Upload receipt" />
      <main className="flex-1 overflow-auto p-5">
        <UploadFlow />
      </main>
    </>
  );
}