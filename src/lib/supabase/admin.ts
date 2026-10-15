import { createClient } from "@supabase/supabase-js";
import { supabaseConfig, isSupabaseAdminConfigured } from "./config";

/**
 * Creates an admin Supabase client with service-role permissions.
 * STRICTLY restricted to server environments (API routes, server actions, background tasks).
 * Never bundle or expose in browser components.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error(
      "SECURITY VIOLATION: createAdminClient cannot be called in browser code."
    );
  }

  if (!isSupabaseAdminConfigured()) {
    return null;
  }

  return createClient(supabaseConfig.url, supabaseConfig.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
