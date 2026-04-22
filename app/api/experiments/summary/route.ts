import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { generateExperimentSummary } from "@/lib/codex";
import {
  getExperimentSummaryContext,
  listExperimentSummaryHistory,
} from "@/lib/experiments";
import { VariantGenerationError } from "@/lib/types";

function createErrorResponse(error: string, code: string, status: number): NextResponse {
  return NextResponse.json({ error, code }, { status });
}

/**
 * Generates an authenticated Codex summary of the merchant's prior experiment performance.
 *
 * @param request - Incoming request with Supabase auth cookies.
 * @returns A structured summary report or an empty-state payload.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
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
    const history = await listExperimentSummaryHistory(user.id);

    if (history.length === 0) {
      return NextResponse.json({ summary: null, empty: true });
    }

    const summary = await generateExperimentSummary(history, (experimentId) =>
      getExperimentSummaryContext(user.id, experimentId)
    );

    return NextResponse.json({ summary, empty: false });
  } catch (error) {
    if (error instanceof VariantGenerationError) {
      return createErrorResponse(error.message, "EXPERIMENT_SUMMARY_ERROR", 500);
    }

    return createErrorResponse(
      error instanceof Error ? error.message : "Unable to summarize experiments.",
      "INTERNAL_SERVER_ERROR",
      500
    );
  }
}
