import type { CookieOptions } from "@supabase/ssr";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ExperimentCard } from "@/components/internal/experiment-card";
import { ExperimentSummaryDrawer } from "@/components/internal/experiment-summary-drawer";
import {
  getExperimentsWithProducts,
  getDynamicWinnerExperimentId,
  resolveDashboardBadgeStatus,
} from "@/lib/experiments";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getExperimentStats } from "@/lib/tracking";
import type { DashboardExperimentCardData, Experiment } from "@/lib/types";

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
    set(_name: string, _value: string, _options: CookieOptions) {
      return;
    },
    remove(_name: string, _options: CookieOptions) {
      return;
    },
  };
}

function getDaysRunning(createdAt: string): number {
  const createdAtTime = new Date(createdAt).getTime();
  const now = Date.now();
  const diffInDays = Math.floor((now - createdAtTime) / (1000 * 60 * 60 * 24));

  return Math.max(1, diffInDays + 1);
}

function getUpliftPercentage(controlRate: number, treatmentRate: number): number {
  if (controlRate === 0) {
    return 0;
  }

  return ((treatmentRate - controlRate) / controlRate) * 100;
}

async function buildDashboardCardData(
  experiment: Experiment,
  product: DashboardExperimentCardData["product"],
  bestConcludedExperimentId: string | null
): Promise<DashboardExperimentCardData> {
  if (experiment.status === "draft") {
    return {
      experiment,
      product,
      stats: null,
      totalVisitors: 0,
      daysRunning: getDaysRunning(experiment.created_at),
      upliftPercentage: 0,
      badgeStatus: resolveDashboardBadgeStatus(experiment, bestConcludedExperimentId),
    };
  }

  const stats = await getExperimentStats(experiment.id);
  const totalVisitors = stats.control.visits + stats.treatment.visits;

  return {
    experiment,
    product,
    stats,
    totalVisitors,
    daysRunning: getDaysRunning(experiment.created_at),
    upliftPercentage: getUpliftPercentage(stats.control.cvr, stats.treatment.cvr),
    badgeStatus: resolveDashboardBadgeStatus(experiment, bestConcludedExperimentId),
  };
}

/**
 * Renders the authenticated experiments dashboard with status cards and metrics.
 *
 * @returns The dashboard page for the current merchant.
 */
export default async function DashboardPage(): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient(createServerCookieStore());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let experimentCards: DashboardExperimentCardData[] = [];
  let errorMessage: string | null = null;

  try {
    const experiments = await getExperimentsWithProducts(user.id);
    const bestConcludedExperimentId = await getDynamicWinnerExperimentId(user.id);

    experimentCards = await Promise.all(
      experiments.map(({ experiment, product }) =>
        buildDashboardCardData(experiment, product, bestConcludedExperimentId)
      )
    );
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Unable to load experiments right now.";
  }

  return (
    <main className="min-h-screen bg-brand-bg px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-brand-border bg-brand-surface p-8 shadow-glow">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.28em] text-brand-accent">
                VariantIQ
              </p>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.15] text-brand-text">Experiments</h1>
              <p className="mt-3 text-brand-muted">
                Review every hypothesis, compare live performance, and jump back into active tests.
              </p>
            </div>
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <div className="rounded-full border border-brand-border bg-brand-bg px-4 py-2 font-mono text-sm text-brand-muted">
                {user.email ?? "merchant@variantiq.dev"}
              </div>
              <ExperimentSummaryDrawer />
              <Link
                href="/experiments/new"
                className="rounded-full bg-brand-accent px-5 py-3 text-sm font-semibold text-brand-bg transition hover:opacity-90"
              >
                + New Experiment
              </Link>
            </div>
          </div>
        </section>

        {errorMessage ? (
          <section className="rounded-3xl border border-brand-warning/30 bg-brand-warning/10 p-6">
            <p className="text-2xl font-semibold leading-[1.15] text-brand-text">Unable to load dashboard</p>
            <p className="mt-3 text-sm text-brand-warning">{errorMessage}</p>
          </section>
        ) : null}

        {!errorMessage && experimentCards.length === 0 ? (
          <section className="rounded-3xl border border-dashed border-brand-border bg-brand-surface p-10 text-center">
            <p className="text-3xl font-semibold leading-[1.15] text-brand-text">No experiments yet.</p>
            <p className="mt-4 text-brand-muted">
              Generate your first control and treatment pair to start tracking results.
            </p>
            <Link
              href="/experiments/new"
              className="mt-6 inline-flex rounded-full bg-brand-accent px-5 py-3 text-sm font-semibold text-brand-bg transition hover:opacity-90"
            >
              Create your first →
            </Link>
          </section>
        ) : null}

        {!errorMessage && experimentCards.length > 0 ? (
          <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {experimentCards.map((experimentCard) => (
              <ExperimentCard
                key={experimentCard.experiment.id}
                experimentCard={experimentCard}
              />
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
