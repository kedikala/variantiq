"use client";

import { useState } from "react";
import type { ExperimentSummaryReport } from "@/lib/types";

interface SummaryApiError {
  error: string;
  code: string;
}

interface SummaryApiResponse {
  summary: ExperimentSummaryReport | null;
  empty?: boolean;
}

function getPriorityClassName(priority: "high" | "medium" | "low"): string {
  if (priority === "high") {
    return "border-brand-warning/40 bg-brand-warning/10 text-brand-warning";
  }

  if (priority === "low") {
    return "border-brand-border bg-brand-bg text-brand-muted";
  }

  return "border-brand-accent/30 bg-brand-accent/15 text-brand-accent";
}

/**
 * Renders the dashboard summarize trigger and an on-demand right-side analysis drawer.
 *
 * @returns A client-side summarize control for the experiments dashboard.
 */
export function ExperimentSummaryDrawer(): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isEmpty, setIsEmpty] = useState<boolean>(false);
  const [summary, setSummary] = useState<ExperimentSummaryReport | null>(null);

  async function loadSummary(forceRefresh = false): Promise<void> {
    if (!forceRefresh && (summary || isEmpty)) {
      setIsOpen(true);
      return;
    }

    setIsOpen(true);
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/experiments/summary", {
        method: "POST",
        cache: "no-store",
      });
      const payload = (await response.json()) as SummaryApiResponse | SummaryApiError;

      if (!response.ok) {
        setSummary(null);
        setIsEmpty(false);
        setErrorMessage((payload as SummaryApiError).error || "Unable to summarize experiments.");
        return;
      }

      const parsedPayload = payload as SummaryApiResponse;
      setSummary(parsedPayload.summary);
      setIsEmpty(Boolean(parsedPayload.empty || !parsedPayload.summary));
    } catch (error) {
      setSummary(null);
      setIsEmpty(false);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to summarize experiments."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void loadSummary()}
        className="rounded-full border border-brand-border px-5 py-3 text-sm font-semibold text-brand-text transition hover:border-brand-accent hover:text-brand-accent"
      >
        Summarize
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            type="button"
            aria-label="Close experiment summary"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-[#05060a]/70 backdrop-blur-sm"
          />
          <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-brand-border bg-brand-surface shadow-[0_0_60px_rgba(0,0,0,0.4)]">
            <div className="flex items-start justify-between gap-4 border-b border-brand-border px-6 py-5">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.22em] text-brand-accent">
                  Codex Summary
                </p>
                <h2 className="mt-3 text-3xl font-semibold leading-[1.15] text-brand-text">
                  Experiment analysis
                </h2>
                <p className="mt-2 text-sm text-brand-muted">
                  Codex reviews live and concluded experiments, then recommends what to test next.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void loadSummary(true)}
                  disabled={isLoading}
                  className="rounded-full border border-brand-border px-4 py-2 text-sm font-semibold text-brand-text transition hover:border-brand-accent hover:text-brand-accent disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? "Refreshing..." : "Refresh"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full border border-brand-border px-4 py-2 text-sm font-semibold text-brand-text transition hover:border-brand-accent hover:text-brand-accent"
                >
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {isLoading ? (
                <div className="space-y-6">
                  <section className="rounded-3xl border border-brand-border bg-brand-bg/70 p-5">
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-muted">
                      In progress
                    </p>
                    <p className="mt-3 text-sm leading-6 text-brand-muted">
                      Codex is reviewing previous hypotheses, outcomes, confidence, and variant
                      rationale to produce a concise report.
                    </p>
                  </section>
                  <div className="space-y-3">
                    <div className="h-5 w-3/5 animate-pulse rounded-full bg-brand-border" />
                    <div className="h-4 w-full animate-pulse rounded-full bg-brand-border" />
                    <div className="h-4 w-5/6 animate-pulse rounded-full bg-brand-border" />
                  </div>
                </div>
              ) : null}

              {!isLoading && errorMessage ? (
                <section className="rounded-3xl border border-brand-warning/30 bg-brand-warning/10 p-6">
                  <p className="text-2xl font-semibold leading-[1.15] text-brand-text">
                    Summary unavailable
                  </p>
                  <p className="mt-3 text-sm text-brand-warning">{errorMessage}</p>
                </section>
              ) : null}

              {!isLoading && !errorMessage && isEmpty ? (
                <section className="rounded-3xl border border-dashed border-brand-border bg-brand-bg/70 p-6">
                  <p className="text-2xl font-semibold leading-[1.15] text-brand-text">
                    No experiment history yet
                  </p>
                  <p className="mt-3 text-sm leading-6 text-brand-muted">
                    Launch a live test or conclude an experiment to give Codex enough signal to
                    analyze patterns and suggest the next best tests.
                  </p>
                </section>
              ) : null}

              {!isLoading && !errorMessage && summary ? (
                <div className="space-y-6">
                  <section className="rounded-3xl border border-brand-border bg-brand-bg/70 p-6">
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-accent">
                      Executive summary
                    </p>
                    <h3 className="mt-4 text-2xl font-semibold leading-[1.15] text-brand-text">
                      {summary.headline}
                    </h3>
                    <p className="mt-4 text-sm leading-7 text-brand-muted">{summary.summary}</p>
                  </section>

                  <section className="rounded-3xl border border-brand-border bg-brand-surface p-6">
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-muted">
                      Findings
                    </p>
                    <ul className="mt-4 space-y-3">
                      {summary.findings.map((finding) => (
                        <li
                          key={finding}
                          className="rounded-2xl border border-brand-border bg-brand-bg/70 px-4 py-3 text-sm leading-6 text-brand-text"
                        >
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="space-y-4">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-muted">
                        Recommendations
                      </p>
                    </div>
                    {summary.recommendations.map((recommendation) => (
                      <article
                        key={`${recommendation.priority}-${recommendation.title}`}
                        className="rounded-3xl border border-brand-border bg-brand-surface p-6"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h4 className="text-xl font-semibold leading-[1.15] text-brand-text">
                              {recommendation.title}
                            </h4>
                            <p className="mt-3 text-sm leading-6 text-brand-muted">
                              {recommendation.rationale}
                            </p>
                          </div>
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${getPriorityClassName(
                              recommendation.priority
                            )}`}
                          >
                            {recommendation.priority}
                          </span>
                        </div>
                        <div className="mt-5 rounded-2xl border border-brand-border bg-brand-bg/70 p-4">
                          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-muted">
                            Suggested hypothesis
                          </p>
                          <p className="mt-3 text-sm leading-6 text-brand-text">
                            {recommendation.hypothesis}
                          </p>
                        </div>
                      </article>
                    ))}
                  </section>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
