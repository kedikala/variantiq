"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  stopExperimentAction,
  type ExperimentStatusActionResult,
} from "@/app/(internal)/experiments/[id]/actions";
import { getExperimentDisplayName } from "@/lib/experiment-naming";
import type {
  DashboardBadgeStatus,
  Experiment,
  ExperimentDashboardStats,
  Product,
  VariantType,
} from "@/lib/types";

interface ExperimentDashboardProps {
  badgeStatus: DashboardBadgeStatus;
  experiment: Experiment;
  product: Product;
  initialDashboardStats: ExperimentDashboardStats;
  initialDayNumber: number;
}

interface ExperimentStatsApiError {
  error: string;
  code: string;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatWholePercent(value: number): string {
  return `${value.toFixed(0)}%`;
}

function formatUplift(value: number): string {
  const prefix = value > 0 ? "+" : "";

  return `${prefix}${value.toFixed(1)}%`;
}

function getLeadingVariant(stats: ExperimentDashboardStats): VariantType {
  return stats.stats.treatment.cvr >= stats.stats.control.cvr ? "treatment" : "control";
}

function getStatusLabel(status: DashboardBadgeStatus): string {
  if (status === "live") {
    return "LIVE";
  }

  if (status === "winner") {
    return "WINNER";
  }

  return status === "draft" ? "DRAFT" : "CONCLUDED";
}

function getStatusClassName(status: DashboardBadgeStatus): string {
  if (status === "live") {
    return "border-brand-accent/30 bg-brand-accent/15 text-brand-accent";
  }

  if (status === "winner") {
    return "border-brand-success/30 bg-brand-success/15 text-brand-success";
  }

  return "border-brand-border bg-brand-bg text-brand-muted";
}

async function fetchExperimentDashboardStats(
  experimentId: string
): Promise<ExperimentDashboardStats> {
  const response = await fetch(`/api/experiments/${experimentId}/stats`, {
    method: "GET",
    cache: "no-store",
  });
  const responseText = await response.text();

  function getFallbackMessage(): string {
    return response.ok
      ? "Unable to parse experiment stats response."
      : "Unable to refresh experiment stats.";
  }

  let parsedPayload: unknown = null;

  if (responseText) {
    try {
      parsedPayload = JSON.parse(responseText) as unknown;
    } catch {
      if (!response.ok) {
        throw new Error(getFallbackMessage());
      }

      throw new Error("Received an invalid stats response from the server.");
    }
  }

  if (!response.ok) {
    const payload =
      parsedPayload && typeof parsedPayload === "object"
        ? (parsedPayload as ExperimentStatsApiError)
        : null;

    throw new Error(payload?.error || getFallbackMessage());
  }

  if (!parsedPayload || typeof parsedPayload !== "object") {
    throw new Error("Received an invalid stats response from the server.");
  }

  return parsedPayload as ExperimentDashboardStats;
}

function getProgressWidth(value: number, comparisonValue: number): string {
  if (value === 0 && comparisonValue === 0) {
    return "0%";
  }

  const maxValue = Math.max(value, comparisonValue);

  return `${Math.max((value / maxValue) * 100, 8).toFixed(0)}%`;
}

/**
 * Renders the live experiment dashboard with polling, charting, and experiment controls.
 *
 * @param props - Initial experiment and stats payload from the server.
 * @returns A client-rendered experiment stats dashboard.
 */
export function ExperimentDashboard({
  badgeStatus,
  experiment,
  product,
  initialDashboardStats,
  initialDayNumber,
}: ExperimentDashboardProps): JSX.Element {
  const [dashboardStats, setDashboardStats] = useState<ExperimentDashboardStats>(
    initialDashboardStats
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<"stop" | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let isActive = true;

    async function refreshStats(): Promise<void> {
      try {
        const nextStats = await fetchExperimentDashboardStats(experiment.id);

        if (isActive) {
          setDashboardStats(nextStats);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to refresh experiment stats."
          );
        }
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshStats();
    }, 10000);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [experiment.id]);

  const leadingVariant = useMemo(() => getLeadingVariant(dashboardStats), [dashboardStats]);
  const winnerVariant = leadingVariant;
  const showWinnerBanner = experiment.status === "live" && dashboardStats.confidence >= 95;
  const experimentTitle = getExperimentDisplayName(experiment);
  const bannerUplift =
    winnerVariant === "treatment"
      ? dashboardStats.upliftPercentage
      : Math.abs(dashboardStats.upliftPercentage);

  function runExperimentAction(
    action: () => Promise<ExperimentStatusActionResult>,
    nextPendingAction: "stop"
  ): void {
    startTransition(async () => {
      setPendingAction(nextPendingAction);
      setErrorMessage(null);

      const result = await action();

      if (result.error) {
        setPendingAction(null);
        setErrorMessage(result.error);
      }
    });
  }

  return (
    <main className="min-h-screen bg-brand-bg px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-brand-border bg-brand-surface p-8 shadow-glow">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3 pb-1">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${getStatusClassName(
                    badgeStatus
                  )}`}
                >
                  {getStatusLabel(badgeStatus)}
                </span>
                <span className="font-mono text-sm uppercase tracking-[0.18em] text-brand-muted">
                  Day {initialDayNumber}
                </span>
              </div>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.15] text-brand-text">
                {experimentTitle}
              </h1>
              <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-brand-muted">
                {product.name} · /products/{product.slug}
              </p>
              <p className="mt-3 max-w-3xl leading-7 text-brand-muted">{experiment.hypothesis}</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {experiment.status === "live" ? (
                <>
                  <Link
                    href={`/products/${product.slug}?preview=control`}
                    className="rounded-full border border-brand-border px-5 py-3 text-sm font-semibold text-brand-text transition hover:border-brand-accent hover:text-brand-accent"
                  >
                    Open Control
                  </Link>
                  <Link
                    href={`/products/${product.slug}?preview=treatment`}
                    className="rounded-full bg-brand-accent px-5 py-3 text-sm font-semibold text-brand-bg transition hover:opacity-90"
                  >
                    Open Treatment
                  </Link>
                </>
              ) : null}
              {experiment.status === "live" ? (
                <button
                  type="button"
                  onClick={() =>
                    runExperimentAction(() => stopExperimentAction(experiment.id), "stop")
                  }
                  disabled={isPending}
                  className="rounded-full border border-brand-border px-5 py-3 text-sm font-semibold text-brand-text transition hover:border-brand-warning hover:text-brand-warning disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending && pendingAction === "stop" ? "Stopping..." : "Stop Experiment"}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {showWinnerBanner ? (
          <section className="rounded-3xl border border-brand-success/35 bg-brand-success/15 p-6">
            <div>
              <div>
                <p className="text-2xl font-semibold leading-[1.15] text-brand-text">
                  🏆 Winner detected at {dashboardStats.confidence}% confidence
                </p>
                <p className="mt-2 text-sm text-brand-success">
                  {winnerVariant === "treatment" ? "Treatment" : "Control"} is leading with{" "}
                  {formatUplift(bannerUplift)} uplift.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {errorMessage ? (
          <section className="rounded-3xl border border-brand-warning/30 bg-brand-warning/10 p-6">
            <p className="text-2xl font-semibold leading-[1.15] text-brand-text">Action blocked</p>
            <p className="mt-3 text-sm text-brand-warning">{errorMessage}</p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-brand-border bg-brand-surface p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-brand-muted">Total visitors</p>
            <p className="mt-4 font-mono text-5xl text-brand-text">
              {dashboardStats.totalVisitors}
            </p>
          </div>
          <div className="rounded-3xl border border-brand-border bg-brand-surface p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-brand-muted">
              Total conversions
            </p>
            <p className="mt-4 font-mono text-5xl text-brand-text">
              {dashboardStats.totalConversions}
            </p>
          </div>
          <div className="rounded-3xl border border-brand-border bg-brand-surface p-6">
            <p className="text-sm uppercase tracking-[0.18em] text-brand-muted">Confidence</p>
            <p className="mt-4 font-mono text-5xl text-brand-text">
              {dashboardStats.confidence}%
            </p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <article className="rounded-3xl border border-brand-border bg-brand-surface p-6 lg:col-span-2">
            <div className="grid gap-6 xl:grid-cols-2">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-muted">
                  Control Preview
                </p>
                <iframe
                  title="Control preview"
                  src={`/products/${product.slug}?preview=control&experimentId=${experiment.id}`}
                  className="mt-4 h-[800px] w-full rounded-3xl border border-brand-border bg-white"
                />
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-muted">
                  Treatment Preview
                </p>
                <iframe
                  title="Treatment preview"
                  src={`/products/${product.slug}?preview=treatment&experimentId=${experiment.id}`}
                  className="mt-4 h-[800px] w-full rounded-3xl border border-brand-border bg-white"
                />
              </div>
            </div>
          </article>
          <article className="rounded-3xl border border-brand-border bg-brand-surface p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-muted">
                  Control
                </p>
                <p className="mt-2 font-mono text-3xl text-brand-text">
                  {formatPercent(dashboardStats.stats.control.cvr)}
                </p>
              </div>
            </div>
            <div className="mt-6 h-4 rounded-full bg-brand-bg">
              <div
                className="h-full rounded-full bg-brand-muted"
                style={{
                  width: getProgressWidth(
                    dashboardStats.stats.control.cvr,
                    dashboardStats.stats.treatment.cvr
                  ),
                }}
              />
            </div>
            <p className="mt-4 text-sm text-brand-muted">
              {dashboardStats.stats.control.visits} visits ·{" "}
              {dashboardStats.stats.control.conversions} conversions
            </p>
          </article>

          <article className="rounded-3xl border border-brand-border bg-brand-surface p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand-muted">
                  Treatment
                </p>
                <p className="mt-2 font-mono text-3xl text-brand-text">
                  {formatPercent(dashboardStats.stats.treatment.cvr)}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                  leadingVariant === "treatment"
                    ? "bg-brand-accent text-brand-bg"
                    : "border border-brand-border text-brand-muted"
                }`}
              >
                {formatUplift(dashboardStats.upliftPercentage)} uplift
              </span>
            </div>
            <div className="mt-6 h-4 rounded-full bg-brand-bg">
              <div
                className={`h-full rounded-full ${
                  leadingVariant === "treatment" ? "bg-brand-accent" : "bg-brand-muted"
                }`}
                style={{
                  width: getProgressWidth(
                    dashboardStats.stats.treatment.cvr,
                    dashboardStats.stats.control.cvr
                  ),
                }}
              />
            </div>
            <p className="mt-4 text-sm text-brand-muted">
              {dashboardStats.stats.treatment.visits} visits ·{" "}
              {dashboardStats.stats.treatment.conversions} conversions
            </p>
          </article>
        </section>

        <section className="rounded-3xl border border-brand-border bg-brand-surface p-6">
          <p className="text-2xl font-semibold leading-[1.15] text-brand-text">Cumulative CVR trend</p>
          <div className="mt-6 h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dashboardStats.timeline}>
                <CartesianGrid stroke="rgba(107,107,128,0.18)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#6b6b80" tick={{ fill: "#6b6b80", fontSize: 12 }} />
                <YAxis
                  stroke="#6b6b80"
                  tick={{ fill: "#6b6b80", fontSize: 12 }}
                  tickFormatter={(value: number) => formatWholePercent(value * 100)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111118",
                    border: "1px solid #1e1e2e",
                    borderRadius: "16px",
                    color: "#e8e8f0",
                  }}
                  formatter={(value: number) => formatPercent(value)}
                />
                <Line
                  type="monotone"
                  dataKey="controlCvr"
                  stroke="#6b6b80"
                  strokeWidth={3}
                  dot={false}
                  name="Control"
                />
                <Line
                  type="monotone"
                  dataKey="treatmentCvr"
                  stroke="#00d4aa"
                  strokeWidth={3}
                  dot={false}
                  name="Treatment"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </main>
  );
}
