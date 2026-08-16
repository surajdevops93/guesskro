/**
 * lib/supabase/middleware.ts
 * ----------------------------------------------------------------------------
 * Refreshes the Supabase auth session on every request. Required because
 * Server Components can't write cookies — without this, a Creator's Google
 * OAuth session silently expires instead of auto-refreshing.
 * Called from the root middleware.ts (see below).
 * ----------------------------------------------------------------------------
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: this call refreshes the token if expired — do not remove.
  await supabase.auth.getUser();

  return response;
}