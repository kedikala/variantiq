import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getExperiment, saveVariants } from "@/lib/experiments";
import type { VariantGenerationResult } from "@/lib/types";

interface PreviewSyncRequestBody {
  experimentId?: string;
  selectedTreatmentId?: string;
  variants?: VariantGenerationResult;
}

function createErrorResponse(error: string, code: string, status: number): NextResponse {
  return NextResponse.json({ error, code }, { status });
}

function resolveSelectedTreatment(
  variants: VariantGenerationResult,
  selectedTreatmentId?: string
): { html: string; rationale: string } {
  const treatments = variants.treatments?.length
    ? variants.treatments
    : [
        {
          id: "treatment",
          label: "Treatment",
          html: variants.treatment.html,
          rationale: variants.treatment.rationale,
        },
      ];
  const selectedTreatment =
    treatments.find((candidate) => candidate.id === selectedTreatmentId) ?? treatments[0];

  return {
    html: selectedTreatment.html,
    rationale: selectedTreatment.rationale,
  };
}

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

  let body: PreviewSyncRequestBody;

  try {
    body = (await request.json()) as PreviewSyncRequestBody;
  } catch {
    return createErrorResponse("Request body must be valid JSON.", "INVALID_REQUEST", 400);
  }

  if (!body.experimentId || !body.variants) {
    return createErrorResponse(
      "experimentId and variants are required.",
      "INVALID_REQUEST",
      400
    );
  }

  try {
    const experiment = await getExperiment(body.experimentId);

    if (experiment.user_id !== user.id) {
      return createErrorResponse("Authentication required.", "UNAUTHORIZED", 401);
    }

    await saveVariants(
      experiment.id,
      body.variants.target_region,
      body.variants.control,
      resolveSelectedTreatment(body.variants, body.selectedTreatmentId)
    );

    return NextResponse.json({ ok: true });
  } catch {
    return createErrorResponse(
      "Unable to update the preview variant.",
      "INTERNAL_SERVER_ERROR",
      500
    );
  }
}
