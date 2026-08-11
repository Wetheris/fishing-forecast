"use client";

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

export function getSupabaseBrowserClient():
  | SupabaseClient
  | null {
  if (client !== undefined) {
    return client;
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    client = null;
    return client;
  }

  client = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return client;
}
