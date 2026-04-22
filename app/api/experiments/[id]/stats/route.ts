import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getExperiment } from "@/lib/experiments";
import { getExperimentDashboardStats } from "@/lib/tracking";

function createErrorResponse(error: string, code: string, status: number): NextResponse {
  return NextResponse.json({ error, code }, { status });
}

/**
 * Returns authenticated, dashboard-ready stats for a single experiment.
 *
 * @param request - Incoming request with Supabase auth cookies.
 * @param context - Route context containing the experiment ID.
 * @returns JSON payload with current metrics and timeline data.
 */
export async function GET(
  request: NextRequest,
  context: { params: { id: string } }
): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return createErrorResponse("Supabase is not configured.", "INTERNAL_SERVER_ERROR", 500);
  }

  const response = NextResponse.next();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return createErrorResponse("Authentication required.", "UNAUTHORIZED", 401);
  }

  try {
    const experiment = await getExperiment(context.params.id);

    if (experiment.user_id !== user.id) {
      return createErrorResponse("Experiment not found.", "NOT_FOUND", 404);
    }

    const dashboardStats = await getExperimentDashboardStats(context.params.id);

    return NextResponse.json(dashboardStats);
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : "Unable to load experiment stats.",
      "STATS_FETCH_ERROR",
      500
    );
  }
}
