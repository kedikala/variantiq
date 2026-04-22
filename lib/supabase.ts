import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

interface SupabaseCookieStore {
  get(name: string): string | undefined;
  set(name: string, value: string, options: CookieOptions): void;
  remove(name: string, options: CookieOptions): void;
}

function getSupabaseEnv(): { supabaseUrl: string; supabaseAnonKey: string } {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

/**
 * Reports whether the public Supabase variables are configured.
 *
 * @returns True when both public Supabase variables are present.
 */
export function hasSupabasePublicEnv(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

/**
 * Creates a browser-side Supabase client for auth flows in client components.
 *
 * @returns A typed Supabase browser client instance.
 * @throws {Error} If the public Supabase environment variables are missing.
 */
export function createSupabaseBrowserClient(): SupabaseClient {
  const env = getSupabaseEnv();

  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}

/**
 * Creates a server-side Supabase client backed by a caller-provided cookie store.
 *
 * @param cookieStore - Cookie accessors from a server component, action, or route handler.
 * @returns A Supabase server client bound to the current request context.
 * @throws {Error} If the public Supabase environment variables are missing.
 */
export function createSupabaseServerClient(cookieStore: SupabaseCookieStore): SupabaseClient {
  const env = getSupabaseEnv();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name);
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set(name, value, options);
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.remove(name, options);
      },
    },
  });
}

/**
 * Returns the public Supabase runtime configuration for middleware and redirects.
 *
 * @returns Public Supabase URL and anon key.
 * @throws {Error} If the public Supabase environment variables are missing.
 */
export function getSupabasePublicEnv(): { supabaseUrl: string; supabaseAnonKey: string } {
  return getSupabaseEnv();
}
