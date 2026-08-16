/**
 * lib/supabase/client.ts
 * ----------------------------------------------------------------------------
 * Supabase client for use in the BROWSER (Client Components, event handlers).
 * Uses the public anon key — safe to expose, since all access is governed
 * by the RLS policies defined in supabase/schema.sql.
 *
 * Usage:
 *   'use client';
 *   import { createClient } from '@/lib/supabase/client';
 *   const supabase = createClient();
 * ----------------------------------------------------------------------------
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}