import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { createExperimentName } from "@/lib/experiment-naming";
import { generateVariants } from "@/lib/codex";
import {
  createExperiment,
  getExperiment,
  saveVariants,
  updateDraftExperiment,
} from "@/lib/experiments";
import { getProduct } from "@/lib/products";
import { VariantGenerationError } from "@/lib/types";

interface GenerateRequestBody {
  experimentId?: string;
  hypothesis?: string;
  productId?: string;
}

function createErrorResponse(error: string, code: string, status: number): NextResponse {
  return NextResponse.json({ error, code }, { status });
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

  let body: GenerateRequestBody;

  try {
    body = (await request.json()) as GenerateRequestBody;
  } catch {
    return createErrorResponse("Request body must be valid JSON.", "INVALID_REQUEST", 400);
  }

  const hypothesis = body.hypothesis?.trim();
  const experimentId = body.experimentId?.trim();
  const productId = body.productId?.trim();

  if (!hypothesis || !productId) {
    return createErrorResponse("Hypothesis and productId are required.", "INVALID_REQUEST", 400);
  }

  try {
    const product = await getProduct(productId);
    const variants = await generateVariants(hypothesis, product);
    let experiment;

    if (experimentId) {
      const existingExperiment = await getExperiment(experimentId);

      if (existingExperiment.user_id !== user.id) {
        return createErrorResponse("Authentication required.", "UNAUTHORIZED", 401);
      }

      if (existingExperiment.status !== "draft") {
        return createErrorResponse(
          "Only draft experiments can be regenerated.",
          "INVALID_REQUEST",
          400
        );
      }

      experiment = await updateDraftExperiment(experimentId, {
        product_id: productId,
        name: createExperimentName(hypothesis),
        hypothesis,
      });
    } else {
      experiment = await createExperiment({
        user_id: user.id,
        product_id: productId,
        name: createExperimentName(hypothesis),
        hypothesis,
      });
    }

    await saveVariants(
      experiment.id,
      variants.target_region,
      variants.control,
      variants.treatment
    );

    return NextResponse.json({
      experimentId: experiment.id,
      target_region: variants.target_region,
      hypothesis_interpretation: variants.hypothesis_interpretation,
      scope_description: variants.scope_description,
      control: variants.control,
      treatments: variants.treatments,
      treatment: variants.treatment,
    });
  } catch (error) {
    if (error instanceof VariantGenerationError) {
      return createErrorResponse(error.message, "VARIANT_GENERATION_ERROR", 500);
    }

    return createErrorResponse(
      "An unexpected error occurred while generating variants.",
      "INTERNAL_SERVER_ERROR",
      500
    );
  }
}
