import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import { getExperimentDashboardStats, getExperimentStats } from "@/lib/tracking";
import type {
  CreateExperimentInput,
  Database,
  DashboardBadgeStatus,
  Experiment,
  ExperimentSummaryContext,
  ExperimentSummaryHistoryItem,
  ExperimentStatus,
  PublicExperimentBundle,
  Product,
  Variant,
  VariantType,
} from "@/lib/types";

type ExperimentRow = Database["public"]["Tables"]["experiments"]["Row"];
type VariantRow = Database["public"]["Tables"]["variants"]["Row"];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function normalizeExperiment(experiment: ExperimentRow): Experiment {
  return {
    ...experiment,
    product_context: experiment.product_context ?? undefined,
    winner: experiment.winner ?? undefined,
  };
}

function normalizeVariant(variant: VariantRow): Variant {
  return {
    ...variant,
    rationale: variant.rationale ?? "",
  };
}

function isSummarizableStatus(
  status: Experiment["status"]
): status is Extract<Experiment["status"], "live" | "concluded"> {
  return status === "live" || status === "concluded";
}

function getUpliftPercentage(controlRate: number, treatmentRate: number): number {
  if (controlRate === 0) {
    return 0;
  }

  return ((treatmentRate - controlRate) / controlRate) * 100;
}

function getDashboardBadgeStatus(
  experiment: Experiment,
  bestConcludedExperimentId: string | null
): DashboardBadgeStatus {
  if (experiment.status === "live") {
    return "live";
  }

  if (experiment.status === "draft") {
    return "draft";
  }

  return experiment.id === bestConcludedExperimentId ? "winner" : "concluded";
}

/**
 * Creates a new experiment record for the authenticated user.
 *
 * @param data - Experiment fields to persist for the current user.
 * @returns The created experiment row.
 * @throws {Error} If the insert fails.
 */
export async function createExperiment(data: CreateExperimentInput): Promise<Experiment> {
  const supabase = createSupabaseAdminClient();
  const { data: experiment, error } = await supabase
    .from("experiments")
    .insert({
      user_id: data.user_id,
      product_id: data.product_id,
      name: data.name,
      hypothesis: data.hypothesis,
      product_context: data.product_context ?? null,
      success_metric: data.success_metric ?? "conversion_rate",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create experiment: ${error.message}`);
  }

  return normalizeExperiment(experiment);
}

/**
 * Updates a draft experiment's core metadata after a regenerate action.
 *
 * @param experimentId - Draft experiment to update.
 * @param data - Fields that should match the latest generated hypothesis and product.
 * @returns The updated experiment row.
 * @throws {Error} If the update fails.
 */
export async function updateDraftExperiment(
  experimentId: string,
  data: Pick<CreateExperimentInput, "product_id" | "name" | "hypothesis" | "product_context"> &
    Partial<Pick<CreateExperimentInput, "success_metric">>
): Promise<Experiment> {
  const supabase = createSupabaseAdminClient();
  const { data: experiment, error } = await supabase
    .from("experiments")
    .update({
      product_id: data.product_id,
      name: data.name,
      hypothesis: data.hypothesis,
      product_context: data.product_context ?? null,
      success_metric: data.success_metric ?? "conversion_rate",
      winner: null,
    })
    .eq("id", experimentId)
    .eq("status", "draft")
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update draft experiment: ${error.message}`);
  }

  return normalizeExperiment(experiment);
}

/**
 * Returns all experiments for a user, sorted by created_at descending.
 *
 * @param userId - Auth user ID that owns the experiments.
 * @returns An array of experiments ordered newest-first.
 * @throws {Error} If the query fails.
 */
export async function getExperiments(userId: string): Promise<Experiment[]> {
  const supabase = createSupabaseAdminClient();
  const { data: experiments, error } = await supabase
    .from("experiments")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load experiments: ${error.message}`);
  }

  return experiments.map(normalizeExperiment);
}

/**
 * Returns all experiments for a user plus their associated product records.
 *
 * @param userId - Auth user ID that owns the experiments.
 * @returns An array of experiment/product pairs ordered newest-first.
 * @throws {Error} If the query fails.
 */
export async function getExperimentsWithProducts(
  userId: string
): Promise<Array<{ experiment: Experiment; product: Product }>> {
  const supabase = createSupabaseAdminClient();
  const { data: rows, error } = await supabase
    .from("experiments")
    .select("*, products!experiments_product_id_fkey(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to load experiments: ${error.message}`);
  }

  return rows.map((row) => {
    const typedRow = row as ExperimentRow & {
      products: Database["public"]["Tables"]["products"]["Row"] | null;
    };

    if (!typedRow.products) {
      throw new Error(`Experiment ${typedRow.id} is missing its linked product.`);
    }

    return {
      experiment: normalizeExperiment(typedRow as ExperimentRow),
      product: typedRow.products,
    };
  });
}

/**
 * Returns a single experiment by ID. Throws if not found.
 *
 * @param id - Experiment ID.
 * @returns The matching experiment row.
 * @throws {Error} If the query fails or no experiment exists.
 */
export async function getExperiment(id: string): Promise<Experiment> {
  const supabase = createSupabaseAdminClient();
  const { data: experiment, error } = await supabase
    .from("experiments")
    .select()
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(`Failed to load experiment: ${error.message}`);
  }

  return normalizeExperiment(experiment);
}

/**
 * Updates experiment status. Also sets winner if provided.
 *
 * @param id - Experiment ID to update.
 * @param status - New lifecycle status.
 * @param winner - Optional winning variant.
 * @returns Resolves when the update completes.
 * @throws {Error} If the update fails.
 */
export async function updateExperimentStatus(
  id: string,
  status: ExperimentStatus,
  winner?: VariantType
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const updatePayload: {
    status: ExperimentStatus;
    winner?: VariantType | null;
  } = { status };

  if (winner !== undefined) {
    updatePayload.winner = winner;
  }

  const { error } = await supabase.from("experiments").update(updatePayload).eq("id", id);

  if (error) {
    throw new Error(`Failed to update experiment status: ${error.message}`);
  }
}

/**
 * Returns the active live experiment for a product, excluding an optional experiment ID.
 *
 * @param productId - Product identifier to check.
 * @param excludeExperimentId - Optional experiment ID to ignore.
 * @returns The live experiment or null.
 * @throws {Error} If the query fails.
 */
export async function getLiveExperimentForProduct(
  productId: string,
  excludeExperimentId?: string
): Promise<Experiment | null> {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("experiments")
    .select()
    .eq("product_id", productId)
    .eq("status", "live")
    .limit(1);

  if (excludeExperimentId) {
    query = query.neq("id", excludeExperimentId);
  }

  const { data: experiment, error } = await query.maybeSingle();

  if (error) {
    throw new Error(`Failed to load live product experiment: ${error.message}`);
  }

  return experiment ? normalizeExperiment(experiment) : null;
}

/**
 * Saves or replaces control and treatment variants for an experiment.
 *
 * @param experimentId - Parent experiment ID.
 * @param targetRegion - Page region owned by both variants.
 * @param control - Control variant HTML and rationale.
 * @param treatment - Treatment variant HTML and rationale.
 * @returns Resolves when both variants are stored.
 * @throws {Error} If the replace operation fails.
 */
export async function saveVariants(
  experimentId: string,
  targetRegion: Variant["target_region"],
  control: Pick<Variant, "html" | "rationale">,
  treatment: Pick<Variant, "html" | "rationale">
): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("variants").upsert([
    {
      experiment_id: experimentId,
      type: "control",
      target_region: targetRegion,
      html: control.html,
      rationale: control.rationale,
    },
    {
      experiment_id: experimentId,
      type: "treatment",
      target_region: targetRegion,
      html: treatment.html,
      rationale: treatment.rationale,
    },
  ], {
    onConflict: "experiment_id,type",
  });

  if (error) {
    throw new Error(`Failed to save variants: ${error.message}`);
  }
}

/**
 * Returns both variants for an experiment as a typed object.
 *
 * @param experimentId - Parent experiment ID.
 * @returns A keyed object containing control and treatment variants.
 * @throws {Error} If the query fails or either variant is missing.
 */
export async function getVariants(
  experimentId: string
): Promise<{ control: Variant; treatment: Variant }> {
  const supabase = createSupabaseAdminClient();
  const { data: variants, error } = await supabase
    .from("variants")
    .select()
    .eq("experiment_id", experimentId);

  if (error) {
    throw new Error(`Failed to load variants: ${error.message}`);
  }

  const controlVariant = variants.find((variant) => variant.type === "control");
  const treatmentVariant = variants.find((variant) => variant.type === "treatment");

  if (!controlVariant || !treatmentVariant) {
    throw new Error(`Expected control and treatment variants for experiment ${experimentId}.`);
  }

  return {
    control: normalizeVariant(controlVariant),
    treatment: normalizeVariant(treatmentVariant),
  };
}

/**
 * Returns a public experiment bundle for store rendering when the experiment is live.
 *
 * @param experimentId - Experiment ID to fetch.
 * @returns The experiment plus both variants, or null when no live experiment exists.
 * @throws {Error} If the underlying queries fail.
 */
export async function getPublicExperimentBundle(
  experimentId: string
): Promise<PublicExperimentBundle | null> {
  if (!isUuid(experimentId)) {
    return null;
  }

  const experiment = await getExperiment(experimentId);

  if (experiment.status !== "live") {
    return null;
  }

  const variants = await getVariants(experimentId);

  return {
    experiment,
    control: variants.control,
    treatment: variants.treatment,
  };
}

/**
 * Returns the public live bundle for a product when a live experiment exists.
 *
 * @param productId - Product identifier whose live experiment should be resolved.
 * @returns The live experiment bundle or null.
 * @throws {Error} If the lookup fails.
 */
export async function getPublicProductExperimentBundle(
  productId: string
): Promise<PublicExperimentBundle | null> {
  const experiment = await getLiveExperimentForProduct(productId);

  if (!experiment) {
    return null;
  }

  const variants = await getVariants(experiment.id);

  return {
    experiment,
    control: variants.control,
    treatment: variants.treatment,
  };
}

/**
 * Returns an explicit experiment bundle for internal previews, regardless of lifecycle status.
 *
 * @param experimentId - Experiment identifier to preview.
 * @param productId - Product identifier that the experiment must belong to.
 * @returns The experiment plus both variants, or null when the IDs do not match a valid experiment.
 * @throws {Error} If the underlying queries fail.
 */
export async function getPreviewExperimentBundle(
  experimentId: string,
  productId: string
): Promise<PublicExperimentBundle | null> {
  if (!isUuid(experimentId)) {
    return null;
  }

  const experiment = await getExperiment(experimentId);

  if (experiment.product_id !== productId) {
    return null;
  }

  const variants = await getVariants(experimentId);

  return {
    experiment,
    control: variants.control,
    treatment: variants.treatment,
  };
}

/**
 * Returns summary-ready history rows for the merchant's live and concluded experiments.
 *
 * @param userId - Authenticated merchant user ID.
 * @returns Summary rows ordered newest-first.
 * @throws {Error} If any experiment metrics or variant data cannot be loaded.
 */
export async function listExperimentSummaryHistory(
  userId: string
): Promise<ExperimentSummaryHistoryItem[]> {
  const experiments = await getExperimentsWithProducts(userId);
  const summarizableExperiments = experiments.filter(({ experiment }) =>
    isSummarizableStatus(experiment.status)
  );

  return Promise.all(
    summarizableExperiments.map(async ({ experiment, product }) => {
      if (!isSummarizableStatus(experiment.status)) {
        throw new Error(`Experiment ${experiment.id} is not eligible for summarization.`);
      }

      const [stats, variants] = await Promise.all([
        getExperimentDashboardStats(experiment.id),
        getVariants(experiment.id),
      ]);

      return {
        experiment_id: experiment.id,
        experiment_name: experiment.name,
        hypothesis: experiment.hypothesis,
        product_name: product.name,
        product_slug: product.slug,
        status: experiment.status,
        target_region: variants.treatment.target_region,
        created_at: experiment.created_at,
        winner: experiment.winner,
        total_visitors: stats.totalVisitors,
        total_conversions: stats.totalConversions,
        control_cvr: stats.stats.control.cvr,
        treatment_cvr: stats.stats.treatment.cvr,
        uplift_percentage: stats.upliftPercentage,
        confidence: stats.confidence,
      };
    })
  );
}

/**
 * Returns detailed analysis context for one merchant-owned experiment.
 *
 * @param userId - Authenticated merchant user ID.
 * @param experimentId - Experiment to inspect.
 * @returns Expanded experiment context with performance metrics and variant rationales.
 * @throws {Error} If the experiment is inaccessible or not eligible for summarization.
 */
export async function getExperimentSummaryContext(
  userId: string,
  experimentId: string
): Promise<ExperimentSummaryContext> {
  const experiment = await getExperiment(experimentId);

  if (experiment.user_id !== userId) {
    throw new Error("Experiment not found.");
  }

  if (!isSummarizableStatus(experiment.status)) {
    throw new Error("Only live and concluded experiments can be summarized.");
  }

  const [
    {
      data: product,
      error: productError,
    },
    variants,
    stats,
  ] = await Promise.all([
    createSupabaseAdminClient().from("products").select().eq("id", experiment.product_id).single(),
    getVariants(experiment.id),
    getExperimentDashboardStats(experiment.id),
  ]);

  if (productError || !product) {
    throw new Error(
      `Failed to load product for experiment summary: ${productError?.message ?? "Missing product."}`
    );
  }

  return {
    experiment_id: experiment.id,
    experiment_name: experiment.name,
    hypothesis: experiment.hypothesis,
    product_name: product.name,
    product_slug: product.slug,
    status: experiment.status as ExperimentSummaryContext["status"],
    target_region: variants.treatment.target_region,
    created_at: experiment.created_at,
    winner: experiment.winner,
    total_visitors: stats.totalVisitors,
    total_conversions: stats.totalConversions,
    control_cvr: stats.stats.control.cvr,
    treatment_cvr: stats.stats.treatment.cvr,
    uplift_percentage: stats.upliftPercentage,
    confidence: stats.confidence,
    control_visits: stats.stats.control.visits,
    control_conversions: stats.stats.control.conversions,
    treatment_visits: stats.stats.treatment.visits,
    treatment_conversions: stats.stats.treatment.conversions,
    control_rationale: variants.control.rationale,
    treatment_rationale: variants.treatment.rationale,
  };
}

/**
 * Resolves the single concluded experiment that should receive the winner badge.
 *
 * @param userId - Authenticated merchant user ID.
 * @returns The best concluded experiment ID, or null when none qualify.
 * @throws {Error} If experiment metrics cannot be loaded.
 */
export async function getDynamicWinnerExperimentId(userId: string): Promise<string | null> {
  const experiments = await getExperiments(userId);
  const concludedExperiments = experiments.filter(
    (experiment) => experiment.status === "concluded"
  );

  const rankedExperiments = await Promise.all(
    concludedExperiments.map(async (experiment) => {
      const stats = await getExperimentStats(experiment.id);
      const totalVisitors = stats.control.visits + stats.treatment.visits;
      const upliftPercentage = getUpliftPercentage(stats.control.cvr, stats.treatment.cvr);

      return {
        experimentId: experiment.id,
        totalVisitors,
        upliftPercentage,
      };
    })
  );

  const bestExperiment = rankedExperiments
    .filter((experiment) => experiment.upliftPercentage > 0)
    .sort((left, right) => {
      if (right.upliftPercentage !== left.upliftPercentage) {
        return right.upliftPercentage - left.upliftPercentage;
      }

      return right.totalVisitors - left.totalVisitors;
    })[0];

  return bestExperiment?.experimentId ?? null;
}

/**
 * Maps an experiment to its dashboard badge status using the shared winner logic.
 *
 * @param experiment - Experiment whose badge is being rendered.
 * @param bestConcludedExperimentId - Current merchant's dynamic winner experiment ID.
 * @returns The status badge label used by dashboard and detail views.
 */
export function resolveDashboardBadgeStatus(
  experiment: Experiment,
  bestConcludedExperimentId: string | null
): DashboardBadgeStatus {
  return getDashboardBadgeStatus(experiment, bestConcludedExperimentId);
}
