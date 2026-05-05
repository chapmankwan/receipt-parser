import { z } from "zod";

// ---------------------------------------------------------------------------
// Helper — makes optional fields that are empty strings behave as undefined.
// This lets us leave Stripe/Inngest/Sentry blank in .env.local during early
// development without Zod complaining they're missing.
// ---------------------------------------------------------------------------
const optionalString = z.string().optional().transform((val) =>
  val === "" ? undefined : val
);

// ---------------------------------------------------------------------------
// Server-side variables
// These are NEVER sent to the browser. If you accidentally import this file
// in a Client Component, Next.js will throw a build error.
// ---------------------------------------------------------------------------
const server = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),

  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),

  // Supabase (server-side service role — has full DB access, keep secret)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
  SUPABASE_RECEIPT_BUCKET: z.string().default("receipt-uploads"),

  // Clerk
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),

  // Anthropic (optional until Step 9 — parser runs in stub mode without it)
  ANTHROPIC_API_KEY: optionalString,

  // Resend
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),

  // Stripe (optional until billing step)
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,

  // Inngest (optional until background jobs step)
  INNGEST_EVENT_KEY: optionalString,
  INNGEST_SIGNING_KEY: optionalString,
});

// ---------------------------------------------------------------------------
// Client-side variables
// Must be prefixed with NEXT_PUBLIC_ — safe to expose to the browser.
// ---------------------------------------------------------------------------
const client = z.object({
  // Supabase (public — used for client-side storage uploads)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),

  // Clerk (public — used in sign-in/sign-up UI)
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),

  // Clerk redirect URLs
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: z.string().default("/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: z.string().default("/sign-up"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: z.string().default("/dashboard"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: z.string().default("/dashboard"),

  // Stripe (optional until billing step)
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalString,

  // Sentry (optional until monitoring step)
  NEXT_PUBLIC_SENTRY_DSN: optionalString,
});

// ---------------------------------------------------------------------------
// Validate
//
// We merge server + client schemas and validate against process.env once at
// module load time. If any required variable is missing or malformed, the app
// throws immediately with a clear field-level error message — not a silent
// undefined deep in a request handler.
//
// The explicit processEnv object (rather than just passing process.env) is
// needed because Next.js statically replaces NEXT_PUBLIC_ variables at build
// time — spreading process.env doesn't work reliably.
// ---------------------------------------------------------------------------
const processEnv = {
  NODE_ENV:                           process.env.NODE_ENV,
  DATABASE_URL:                       process.env.DATABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY:          process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_RECEIPT_BUCKET:            process.env.SUPABASE_RECEIPT_BUCKET,
  CLERK_SECRET_KEY:                   process.env.CLERK_SECRET_KEY,
  ANTHROPIC_API_KEY:                  process.env.ANTHROPIC_API_KEY,
  RESEND_API_KEY:                     process.env.RESEND_API_KEY,
  STRIPE_SECRET_KEY:                  process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET:              process.env.STRIPE_WEBHOOK_SECRET,
  INNGEST_EVENT_KEY:                  process.env.INNGEST_EVENT_KEY,
  INNGEST_SIGNING_KEY:                process.env.INNGEST_SIGNING_KEY,
  NEXT_PUBLIC_SUPABASE_URL:           process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY:      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL:      process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_SIGN_UP_URL:      process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL:  process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL:  process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SENTRY_DSN:             process.env.NEXT_PUBLIC_SENTRY_DSN,
};

const merged = server.merge(client);
const parsed = merged.safeParse(processEnv);

if (!parsed.success) {
  console.error("❌  Missing or invalid environment variables:\n");
  const errors = parsed.error.flatten().fieldErrors;
  for (const [field, messages] of Object.entries(errors)) {
    console.error(`  ${field}: ${messages?.join(", ")}`);
  }
  console.error("\nCheck your .env.local file against .env.local.example\n");
  throw new Error("Invalid environment variables — see above for details");
}

export const env = parsed.data;