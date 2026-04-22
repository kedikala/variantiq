import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

function getSupabaseAdminEnv(): {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
} {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase admin environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return { supabaseUrl, supabaseServiceRoleKey };
}

/**
 * Creates a server-only Supabase client using the service role key.
 *
 * @returns A typed Supabase client for server-side database access.
 * @throws {Error} If the admin Supabase environment variables are missing.
 */
export function createSupabaseAdminClient(): SupabaseClient<Database> {
  const { supabaseServiceRoleKey, supabaseUrl } = getSupabaseAdminEnv();

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
