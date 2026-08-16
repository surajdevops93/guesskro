/**
 * lib/supabase/server.ts
 * ----------------------------------------------------------------------------
 * Supabase client for use on the SERVER only — Server Components, Server
 * Actions, and Route Handlers. Reads/writes auth cookies via next/headers,
 * which is what lets the Creator's Google OAuth session persist across
 * requests without a client-side token dance.
 *
 * NEVER import this file from a Client Component ('use client') — next/headers
 * is not available in the browser and the build will fail. For browser-side
 * queries (e.g. the public leaderboard read in QuizPlayer), use
 * lib/supabase/client.ts instead.
 *
 * Usage (inside an async Server Component / Route Handler):
 *   import { createClient } from '@/lib/supabase/server';
 *   const supabase = await createClient();
 * ----------------------------------------------------------------------------
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component (not a Server Action
            // or Route Handler) — this can be safely ignored IF you have
            // middleware.ts refreshing the session on every request.
          }
        },
      },
    }
  );
}