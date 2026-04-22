"use server";

import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getExperiment, updateExperimentStatus } from "@/lib/experiments";
import { createSupabaseServerClient } from "@/lib/supabase";

export interface ExperimentStatusActionResult {
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

async function assertExperimentOwnership(experimentId: string): Promise<void> {
  const supabase = createSupabaseServerClient(createServerCookieStore());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to update this experiment.");
  }

  const experiment = await getExperiment(experimentId);

  if (experiment.user_id !== user.id) {
    throw new Error("You do not have access to update this experiment.");
  }
}

/**
 * Concludes an experiment and redirects the merchant back to the dashboard.
 *
 * @param experimentId - Experiment ID to stop.
 * @returns An error payload only if the update fails.
 */
export async function stopExperimentAction(
  experimentId: string
): Promise<ExperimentStatusActionResult> {
  try {
    await assertExperimentOwnership(experimentId);
    await updateExperimentStatus(experimentId, "concluded");
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to stop the experiment.",
    };
  }

  redirect("/dashboard");
}
