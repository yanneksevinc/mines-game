import { createClient } from '@supabase/supabase-js';

// Lazy singleton — not initialized at module load time so Vercel's
// build-time static analysis doesn't throw when env vars are absent.
let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

// Server-side client (API routes only)
// Uses anon key for demo — open RLS policies allow all operations.
// In production swap in SUPABASE_SERVICE_ROLE_KEY.
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
