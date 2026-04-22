import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getConfidence } from "@/lib/utils";
import type {
  Database,
  ExperimentDashboardStats,
  ExperimentStats,
  ExperimentTimelinePoint,
  VariantType,
} from "@/lib/types";

type VisitRow = Database["public"]["Tables"]["visits"]["Row"];

function calculateConversionRate(visits: number, conversions: number): number {
  if (visits === 0) {
    return 0;
  }

  return conversions / visits;
}

function getHourlyBucketLabel(createdAt: string): string {
  return createdAt.slice(0, 13) + ":00";
}

function calculateUpliftPercentage(controlRate: number, treatmentRate: number): number {
  if (controlRate === 0) {
    return 0;
  }

  return ((treatmentRate - controlRate) / controlRate) * 100;
}

function countConversions(visits: VisitRow[], variantType: VariantType): number {
  return visits.filter((visit) => visit.variant_type === variantType && visit.converted).length;
}

function countVisits(visits: VisitRow[], variantType: VariantType): number {
  return visits.filter((visit) => visit.variant_type === variantType).length;
}

function buildTimeline(visits: VisitRow[]): ExperimentTimelinePoint[] {
  const sortedVisits = [...visits].sort((left, right) =>
    left.created_at.localeCompare(right.created_at)
  );
  const timelineMap = new Map<
    string,
    {
      controlVisits: number;
      controlConversions: number;
      treatmentVisits: number;
      treatmentConversions: number;
    }
  >();

  let controlVisits = 0;
  let controlConversions = 0;
  let treatmentVisits = 0;
  let treatmentConversions = 0;

  for (const visit of sortedVisits) {
    if (visit.variant_type === "control") {
      controlVisits += 1;
      if (visit.converted) {
        controlConversions += 1;
      }
    } else {
      treatmentVisits += 1;
      if (visit.converted) {
        treatmentConversions += 1;
      }
    }

    timelineMap.set(getHourlyBucketLabel(visit.created_at), {
      controlVisits,
      controlConversions,
      treatmentVisits,
      treatmentConversions,
    });
  }

  return Array.from(timelineMap.entries()).map(([label, totals]) => ({
    label,
    controlCvr: calculateConversionRate(totals.controlVisits, totals.controlConversions),
    treatmentCvr: calculateConversionRate(totals.treatmentVisits, totals.treatmentConversions),
  }));
}

/**
 * Logs a single page visit to a variant.
 *
 * @param experimentId - Experiment receiving the visit.
 * @param variantType - Assigned variant for the visitor.
 * @param visitorId - Anonymous visitor identifier.
 * @returns Resolves when the visit record is inserted.
 * @throws {Error} If the insert fails.
 */
export async function logVisit(
  experimentId: string,
  variantType: VariantType,
  visitorId: string
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const visitLookup = supabase.from("visits").select("id");

  if (
    visitLookup &&
    typeof visitLookup.eq === "function" &&
    typeof visitLookup.limit === "function" &&
    typeof visitLookup.maybeSingle === "function"
  ) {
    const { data: existingVisit, error: lookupError } = await visitLookup
      .eq("experiment_id", experimentId)
      .eq("variant_type", variantType)
      .eq("visitor_id", visitorId)
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      throw new Error(`Failed to check existing visit: ${lookupError.message}`);
    }

    if (existingVisit) {
      return;
    }
  }

  const { error } = await supabase.from("visits").insert({
    experiment_id: experimentId,
    variant_type: variantType,
    visitor_id: visitorId,
  });

  if (error) {
    throw new Error(`Failed to log visit: ${error.message}`);
  }
}

/**
 * Marks a visit as converted for a given visitor and variant.
 *
 * @param experimentId - Experiment receiving the conversion.
 * @param variantType - Variant the visitor saw.
 * @param visitorId - Anonymous visitor identifier.
 * @returns Resolves when the conversion update completes.
 * @throws {Error} If the lookup or update fails.
 */
export async function logConversion(
  experimentId: string,
  variantType: VariantType,
  visitorId: string
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { data: visit, error: visitError } = await supabase
    .from("visits")
    .select("id")
    .eq("experiment_id", experimentId)
    .eq("variant_type", variantType)
    .eq("visitor_id", visitorId)
    .eq("converted", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (visitError) {
    throw new Error(`Failed to load visit for conversion: ${visitError.message}`);
  }

  if (!visit) {
    return;
  }

  const { error } = await supabase.from("visits").update({ converted: true }).eq("id", visit.id);

  if (error) {
    throw new Error(`Failed to log conversion: ${error.message}`);
  }
}

/**
 * Returns visit counts, conversion counts, and CVR per variant.
 * Returns zeros (not NaN/Infinity) when no data exists.
 *
 * @param experimentId - Experiment to aggregate.
 * @returns Visits, conversions, and CVR for control and treatment.
 * @throws {Error} If the query fails.
 */
export async function getExperimentStats(experimentId: string): Promise<ExperimentStats> {
  const supabase = createSupabaseAdminClient();
  const { data: visits, error } = await supabase
    .from("visits")
    .select()
    .eq("experiment_id", experimentId);

  if (error) {
    throw new Error(`Failed to load experiment stats: ${error.message}`);
  }

  const controlVisits = countVisits(visits, "control");
  const treatmentVisits = countVisits(visits, "treatment");
  const controlConversions = countConversions(visits, "control");
  const treatmentConversions = countConversions(visits, "treatment");

  return {
    control: {
      visits: controlVisits,
      conversions: controlConversions,
      cvr: calculateConversionRate(controlVisits, controlConversions),
    },
    treatment: {
      visits: treatmentVisits,
      conversions: treatmentConversions,
      cvr: calculateConversionRate(treatmentVisits, treatmentConversions),
    },
  };
}

/**
 * Returns dashboard-ready experiment stats, confidence, uplift, and chart timeline data.
 *
 * @param experimentId - Experiment to aggregate.
 * @returns Stats, derived metrics, and cumulative hourly CVR points.
 * @throws {Error} If the query fails.
 */
export async function getExperimentDashboardStats(
  experimentId: string
): Promise<ExperimentDashboardStats> {
  const supabase = createSupabaseAdminClient();
  const { data: visits, error } = await supabase
    .from("visits")
    .select()
    .eq("experiment_id", experimentId);

  if (error) {
    throw new Error(`Failed to load experiment dashboard stats: ${error.message}`);
  }

  const controlVisits = countVisits(visits, "control");
  const treatmentVisits = countVisits(visits, "treatment");
  const controlConversions = countConversions(visits, "control");
  const treatmentConversions = countConversions(visits, "treatment");
  const stats: ExperimentStats = {
    control: {
      visits: controlVisits,
      conversions: controlConversions,
      cvr: calculateConversionRate(controlVisits, controlConversions),
    },
    treatment: {
      visits: treatmentVisits,
      conversions: treatmentConversions,
      cvr: calculateConversionRate(treatmentVisits, treatmentConversions),
    },
  };
  const totalVisitors = controlVisits + treatmentVisits;
  const totalConversions = controlConversions + treatmentConversions;

  return {
    stats,
    confidence: getConfidence(
      controlVisits,
      controlConversions,
      treatmentVisits,
      treatmentConversions
    ),
    totalVisitors,
    totalConversions,
    upliftPercentage: calculateUpliftPercentage(stats.control.cvr, stats.treatment.cvr),
    timeline: buildTimeline(visits),
  };
}
