import { type NextRequest, NextResponse } from "next/server";
import { logConversion } from "@/lib/tracking";
import type { VariantType } from "@/lib/types";

interface TrackingRequestBody {
  experimentId?: string;
  variantType?: VariantType;
  visitorId?: string;
}

function createErrorResponse(error: string, code: string, status: number): NextResponse {
  return NextResponse.json({ error, code }, { status });
}

/**
 * Public endpoint for logging anonymous conversions.
 *
 * @param request - Incoming tracking request body.
 * @returns Success payload or validation error response.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: TrackingRequestBody;

  try {
    body = (await request.json()) as TrackingRequestBody;
  } catch {
    return createErrorResponse("Request body must be valid JSON.", "INVALID_REQUEST", 400);
  }

  if (!body.experimentId || !body.variantType || !body.visitorId) {
    return createErrorResponse(
      "experimentId, variantType, and visitorId are required.",
      "INVALID_REQUEST",
      400
    );
  }

  try {
    await logConversion(body.experimentId, body.variantType, body.visitorId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(
      error instanceof Error ? error.message : "Unable to track conversion.",
      "TRACKING_ERROR",
      500
    );
  }
}
