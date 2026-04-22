"use client";

import Link from "next/link";
import { getExperimentDisplayName } from "@/lib/experiment-naming";
import type { DashboardBadgeStatus, DashboardExperimentCardData } from "@/lib/types";

interface StatusBadgeStyle {
  label: string;
  className: string;
}

function getStatusBadgeStyle(status: DashboardBadgeStatus): StatusBadgeStyle {
  if (status === "live") {
    return {
      label: "LIVE",
      className: "border-brand-accent/30 bg-brand-accent/15 text-brand-accent",
    };
  }

  if (status === "winner") {
    return {
      label: "WINNER",
      className: "border-brand-success/30 bg-brand-success/15 text-brand-success",
    };
  }

  if (status === "concluded") {
    return {
      label: "CONCLUDED",
      className: "border-brand-border bg-brand-bg text-brand-muted",
    };
  }

  return {
    label: "DRAFT",
    className: "border-brand-border bg-brand-bg text-brand-muted",
  };
}

function formatConversionRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatUplift(upliftPercentage: number): string {
  const prefix = upliftPercentage > 0 ? "+" : "";

  return `${prefix}${upliftPercentage.toFixed(1)}% uplift`;
}

/**
 * Renders a clickable experiment summary card for the dashboard.
 *
 * @param props - Experiment summary data for a single card.
 * @returns A client-rendered dashboard card.
 */
export function ExperimentCard({
  experimentCard,
}: {
  experimentCard: DashboardExperimentCardData;
}): JSX.Element {
  const badge = getStatusBadgeStyle(experimentCard.badgeStatus);
  const showMetrics = Boolean(experimentCard.stats);
  const experimentTitle = getExperimentDisplayName(experimentCard.experiment);

  return (
    <Link
      href={`/experiments/${experimentCard.experiment.id}`}
      className="group flex h-full flex-col rounded-3xl border border-brand-border bg-brand-surface p-6 transition hover:border-brand-accent/40 hover:shadow-glow"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-brand-muted">
            {experimentCard.product.name}
          </p>
          <p className="text-2xl font-semibold leading-[1.15] text-brand-text transition group-hover:text-brand-accent">
            {experimentTitle}
          </p>
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-brand-muted">
            {experimentCard.experiment.hypothesis}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      {showMetrics ? (
        <div className="mt-6 grid gap-4 rounded-3xl border border-brand-border bg-brand-bg/70 p-5 sm:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-muted">
              Control CVR
            </p>
            <p className="mt-2 font-mono text-2xl text-brand-text">
              {formatConversionRate(experimentCard.stats?.control.cvr ?? 0)}
            </p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-muted">
              Treatment CVR
            </p>
            <p className="mt-2 font-mono text-2xl text-brand-text">
              {formatConversionRate(experimentCard.stats?.treatment.cvr ?? 0)}
            </p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-muted">
              Visitors
            </p>
            <p className="mt-2 font-mono text-2xl text-brand-text">{experimentCard.totalVisitors}</p>
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-muted">
              Uplift
            </p>
            <p className="mt-2 font-mono text-2xl text-brand-accent">
              {formatUplift(experimentCard.upliftPercentage)}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-3xl border border-dashed border-brand-border p-5">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-muted">
            Draft metrics
          </p>
          <p className="mt-3 text-sm leading-6 text-brand-muted">
            This draft has not started collecting visits or conversions yet.
          </p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between border-t border-brand-border pt-5 text-sm text-brand-muted">
        <span>{experimentCard.daysRunning} day(s) running</span>
        <span className="font-medium text-brand-text">Open experiment →</span>
      </div>
    </Link>
  );
}
