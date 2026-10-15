import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig, isSupabaseConfigured } from "./config";

/**
 * Creates a browser-side Supabase client using public credentials only.
 * Never uses or leaks the service role key.
 */
export function createClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }
  return createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey);
}
