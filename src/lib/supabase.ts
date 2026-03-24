import { createClient } from '@supabase/supabase-js';

// NEXT_PUBLIC_ keys are intentionally public (shipped in the client bundle).
// These fallbacks mean the demo works even if Vercel env vars aren't configured.
// For production, set proper env vars in the Vercel dashboard.
const DEMO_URL = 'https://lihztkriauzpviyulljx.supabase.co';
const DEMO_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpaHp0a3JpYXV6cHZpeXVsbGp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNjUzMjUsImV4cCI6MjA4OTk0MTMyNX0.' +
  'F3oeyF51i1Zn-tZsrV1CJ-DDY0BsgzomMFL-eEGh43Q';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEMO_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEMO_ANON_KEY;

// Lazy singleton — not initialized at module load time.
let _supabase: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey);
  }
  return _supabase;
}

// Server-side client (API routes only).
// Uses anon key for demo — open RLS policies allow all operations.
// In production, set SUPABASE_SERVICE_ROLE_KEY in Vercel dashboard.
export function createServiceClient() {
  return createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  );
}
