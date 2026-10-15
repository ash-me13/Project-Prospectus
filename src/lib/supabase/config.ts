/**
 * Supabase Environment Configuration & Honest Verification
 */

export const supabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(
    supabaseConfig.url &&
      supabaseConfig.url.startsWith("http") &&
      supabaseConfig.anonKey &&
      supabaseConfig.anonKey.length > 20
  );
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    isSupabaseConfigured() &&
      supabaseConfig.serviceRoleKey &&
      supabaseConfig.serviceRoleKey.length > 20
  );
}
