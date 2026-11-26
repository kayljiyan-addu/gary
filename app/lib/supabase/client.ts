"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

export type BrowserSupabaseClient = ReturnType<typeof createBrowserClient<Database>>;

let client: BrowserSupabaseClient | null = null;

export function getSupabaseBrowserClient(): BrowserSupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return null;
  }

  client ??= createBrowserClient<Database>(url, key);
  return client;
}
