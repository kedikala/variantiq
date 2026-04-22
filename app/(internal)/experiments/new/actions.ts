"use server";

import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createExperimentName } from "@/lib/experiment-naming";
import {
  createExperiment,
  getExperiment,
  getLiveExperimentForProduct,
  saveVariants,
  updateExperimentStatus,
} from "@/lib/experiments";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { VariantGenerationResult } from "@/lib/types";

interface ExperimentMutationInput {
  experimentId?: string;
  productId: string;
  hypothesis: string;
  selectedTreatmentId?: string;
  variants: VariantGenerationResult;
}

export interface ExperimentMutationResult {
  error: string | null;
}

function createServerCookieStore(): {
  get(name: string): string | undefined;
  set(name: string, value: string, options: CookieOptions): void;
  remove(name: string, options: CookieOptions): void;
} {
  const cookieStore = cookies();

  return {
    get(name: string) {
      return cookieStore.get(name)?.value;
    },
    set(name: string, value: string, options: CookieOptions) {
      cookieStore.set({ ...options, name, value });
    },
    remove(name: string, options: CookieOptions) {
      cookieStore.set({ ...options, name, value: "" });
    },
  };
}

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = createSupabaseServerClient(createServerCookieStore());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to save an experiment.");
  }

  return user.id;
}

async function assertExperimentOwnership(experimentId: string): Promise<void> {
  const userId = await getAuthenticatedUserId();
  const experiment = await getExperiment(experimentId);

  if (experiment.user_id !== userId) {
    throw new Error("You do not have access to update this experiment.");
  }
}

async function assertLiveExperimentAvailability(
  productId: string,
  experimentId?: string
): Promise<void> {
  const liveExperiment = await getLiveExperimentForProduct(productId, experimentId);

  if (liveExperiment) {
    throw new Error("This product already has a live experiment. Stop it before launching another.");
  }
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

async function ensurePersistedExperiment(input: ExperimentMutationInput): Promise<string> {
  if (input.experimentId) {
    await assertExperimentOwnership(input.experimentId);

    return input.experimentId;
  }

  const userId = await getAuthenticatedUserId();
  const experiment = await createExperiment({
    user_id: userId,
    product_id: input.productId,
    name: createExperimentName(input.hypothesis),
    hypothesis: input.hypothesis,
  });

  await saveVariants(
    experiment.id,
    input.variants.target_region,
    input.variants.control,
    resolveSelectedTreatment(input.variants, input.selectedTreatmentId)
  );

  return experiment.id;
}

/**
 * Saves the generated experiment as a draft and redirects to the dashboard.
 *
 * @param input - Experiment form values and generated variants.
 * @returns An error payload only when persistence fails.
 */
export async function saveDraftAction(
  input: ExperimentMutationInput
): Promise<ExperimentMutationResult> {
  try {
    await ensurePersistedExperiment(input);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save the draft experiment.",
    };
  }

  redirect("/dashboard");
}

/**
 * Saves the generated experiment, marks it live, and redirects to the experiment detail page.
 *
 * @param input - Experiment form values and generated variants.
 * @returns An error payload only when persistence fails.
 */
export async function launchExperimentAction(
  input: ExperimentMutationInput
): Promise<ExperimentMutationResult> {
  let experimentId: string;

  try {
    experimentId = await ensurePersistedExperiment(input);
    await assertLiveExperimentAvailability(input.productId, experimentId);

    await updateExperimentStatus(experimentId, "live");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to launch the experiment.",
    };
  }
  redirect(`/experiments/${experimentId}`);
}
