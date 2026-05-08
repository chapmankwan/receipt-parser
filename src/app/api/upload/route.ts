import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/env";

// ---------------------------------------------------------------------------
// POST /api/upload
//
// Receives a receipt image from the browser, uploads it to Supabase storage
// using the service role key (bypasses RLS), and returns the storage path.
//
// We do the upload server-side because the browser has no Supabase auth
// session — we use Clerk for auth, not Supabase Auth.
//
// The image is stored temporarily. receipt.parse fetches and deletes it
// immediately after parsing. It never persists beyond the parse step.
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  // Verify the user is signed in via Clerk
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Validate file type
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json(
      { error: "File must be a JPEG, PNG, or WebP image" },
      { status: 400 }
    );
  }

  // Validate file size — 10MB max
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File must be under 10MB" },
      { status: 400 }
    );
  }

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Scope the path to the user's Clerk ID so files are logically separated
  const ext  = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(env.SUPABASE_RECEIPT_BUCKET)
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error("[upload] Supabase error:", error.message);
    return NextResponse.json(
      { error: "Upload failed — " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ path });
}