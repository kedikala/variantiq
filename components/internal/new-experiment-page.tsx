"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  launchExperimentAction,
  saveDraftAction,
  type ExperimentMutationResult,
} from "@/app/(internal)/experiments/new/actions";
import type { GeneratedTreatmentCandidate, Product, VariantGenerationResult } from "@/lib/types";

const MIN_HYPOTHESIS_LENGTH = 20;
const LOADING_MESSAGES = [
  "Reading your hypothesis...",
  "Generating control baseline...",
  "Generating treatment concepts in parallel...",
  "Writing rationales...",
] as const;

type RetryAction = "generate" | "draft" | "launch" | null;
type PendingAction = "draft" | "launch" | null;

interface FormState {
  productId: string;
  hypothesis: string;
}

interface GenerateApiError {
  error: string;
  code: string;
}

interface PreviewSyncError {
  error: string;
  code: string;
}

interface GenerateApiSuccess {
  experimentId?: string;
  target_region?: VariantGenerationResult["target_region"];
  hypothesis_interpretation?: string;
  scope_description?: string;
  control: VariantGenerationResult["control"];
  treatment: VariantGenerationResult["treatment"];
  treatments?: GeneratedTreatmentCandidate[];
}

interface NewExperimentClientPageProps {
  products: Product[];
}

function normalizeTreatmentCandidates(
  payload: Pick<GenerateApiSuccess, "treatments" | "treatment">
): GeneratedTreatmentCandidate[] {
  if (payload.treatments?.length) {
    return payload.treatments;
  }

  return [
    {
      id: "treatment",
      label: "Treatment",
      html: payload.treatment.html,
      rationale: payload.treatment.rationale,
    },
  ];
}

function getValidationError(hypothesis: string): string | null {
  const normalizedHypothesis = hypothesis.trim();

  if (!normalizedHypothesis) {
    return "Hypothesis is required.";
  }

  if (normalizedHypothesis.length < MIN_HYPOTHESIS_LENGTH) {
    return "Hypothesis must be at least 20 characters.";
  }

  return null;
}

function getRetryLabel(retryAction: RetryAction): string {
  if (retryAction === "launch") {
    return "Retry launch";
  }

  if (retryAction === "draft") {
    return "Retry draft save";
  }

  return "Try again";
}

/**
 * Renders the hypothesis form, loading sequence, and generated variant preview UI.
 *
 * @returns The interactive new experiment page content.
 */
export function NewExperimentClientPage({
  products,
}: NewExperimentClientPageProps): JSX.Element {
  const [formState, setFormState] = useState<FormState>({
    productId: products[0]?.id ?? "",
    hypothesis: "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryAction, setRetryAction] = useState<RetryAction>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [generatedExperimentId, setGeneratedExperimentId] = useState<string | null>(null);
  const [generatedVariants, setGeneratedVariants] = useState<VariantGenerationResult | null>(null);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isSaving, startSaveTransition] = useTransition();

  const currentLoadingMessage = LOADING_MESSAGES[loadingIndex];
  const hypothesisLength = formState.hypothesis.trim().length;
  const selectedProduct =
    products.find((product) => product.id === formState.productId) ?? products[0] ?? null;
  const treatmentCandidates = useMemo(
    () => (generatedVariants ? generatedVariants.treatments : []),
    [generatedVariants]
  );
  const selectedTreatment =
    treatmentCandidates.find((candidate) => candidate.id === selectedTreatmentId) ??
    treatmentCandidates[0] ??
    null;
  const canPersist = Boolean(generatedVariants && selectedTreatment) && !isSaving && !isGenerating;

  useEffect(() => {
    if (!isGenerating) {
      setLoadingIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setLoadingIndex((currentIndex) => (currentIndex + 1) % LOADING_MESSAGES.length);
    }, 800);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isGenerating]);

  useEffect(() => {
    async function syncPreviewVariant(): Promise<void> {
      if (!generatedExperimentId || !generatedVariants || !selectedTreatment) {
        return;
      }

      const response = await fetch("/api/generate/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          experimentId: generatedExperimentId,
          selectedTreatmentId: selectedTreatment.id,
          variants: generatedVariants,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as PreviewSyncError;
        throw new Error(payload.error || "Unable to update the preview variant.");
      }

      setPreviewVersion((currentVersion) => currentVersion + 1);
    }

    void syncPreviewVariant().catch((error) => {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update the preview variant."
      );
    });
  }, [generatedExperimentId, generatedVariants, selectedTreatment]);

  async function handleGenerate(): Promise<void> {
    const nextValidationError = getValidationError(formState.hypothesis);

    if (nextValidationError) {
      setValidationError(nextValidationError);
      setErrorMessage(null);
      setRetryAction(null);
      return;
    }

    try {
      setIsGenerating(true);
      setValidationError(null);
      setErrorMessage(null);
      setRetryAction(null);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          experimentId: generatedExperimentId,
          productId: formState.productId,
          hypothesis: formState.hypothesis.trim(),
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as GenerateApiError;

        throw new Error(payload.error || "Variant generation failed.");
      }

      const payload = (await response.json()) as GenerateApiSuccess;
      const treatments = normalizeTreatmentCandidates(payload);

      setGeneratedExperimentId(payload.experimentId ?? null);
      setGeneratedVariants({
        target_region: payload.target_region ?? "purchase",
        hypothesis_interpretation:
          payload.hypothesis_interpretation ??
          "Tests whether changing the targeted purchase module improves conversion.",
        scope_description: payload.scope_description ?? "purchase section",
        control: payload.control,
        treatments,
        treatment: {
          html: treatments[0].html,
          rationale: treatments[0].rationale,
        },
      });
      setSelectedTreatmentId(treatments[0]?.id ?? null);
      setPreviewVersion(0);
    } catch (error) {
      setGeneratedExperimentId(null);
      setGeneratedVariants(null);
      setSelectedTreatmentId(null);
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to generate variants right now."
      );
      setRetryAction("generate");
    } finally {
      setIsGenerating(false);
    }
  }

  function runMutation(
    action: (input: {
      experimentId?: string;
      productId: string;
      hypothesis: string;
      selectedTreatmentId?: string;
      variants: VariantGenerationResult;
    }) => Promise<ExperimentMutationResult>,
    failedAction: Exclude<RetryAction, "generate" | null>
  ): void {
    if (!generatedVariants) {
      return;
    }

    startSaveTransition(async () => {
      setErrorMessage(null);
      setRetryAction(null);
      setPendingAction(failedAction);

      const result = await action({
        experimentId: generatedExperimentId ?? undefined,
        productId: formState.productId,
        hypothesis: formState.hypothesis.trim(),
        selectedTreatmentId: selectedTreatment?.id,
        variants: generatedVariants,
      });

      if (result.error) {
        setErrorMessage(result.error);
        setRetryAction(failedAction);
        setPendingAction(null);
      }
    });
  }

  function handleRetry(): void {
    if (retryAction === "draft") {
      runMutation(saveDraftAction, "draft");
      return;
    }

    if (retryAction === "launch") {
      runMutation(launchExperimentAction, "launch");
      return;
    }

    void handleGenerate();
  }

  return (
    <main className="min-h-screen bg-brand-bg px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-brand-border bg-brand-surface p-8 shadow-glow">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-brand-accent">
            New Experiment
          </p>
          <h1 className="mt-4 font-display text-4xl text-brand-text">Create Experiment</h1>
          <p className="mt-3 max-w-2xl text-brand-muted">
            Turn a merchant hypothesis into two live-ready variants and decide whether to save it
            as a draft or launch it immediately.
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-brand-text">Product</span>
                <select
                  value={formState.productId}
                  onChange={(event) =>
                    setFormState((currentState) => ({
                      ...currentState,
                      productId: event.target.value,
                    }))
                  }
                  className="w-full rounded-3xl border border-brand-border bg-brand-bg px-5 py-4 text-base text-brand-text outline-none transition focus:border-brand-accent"
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-brand-text">
                  Hypothesis
                </span>
                <textarea
                  value={formState.hypothesis}
                  onChange={(event) => {
                    setValidationError(null);
                    setFormState((currentState) => ({
                      ...currentState,
                      hypothesis: event.target.value,
                    }));
                  }}
                  rows={7}
                  placeholder="Example: Adding urgency-focused copy to the add-to-cart CTA will increase conversion rate for limited inventory products."
                  className="w-full rounded-3xl border border-brand-border bg-brand-bg px-5 py-4 text-base text-brand-text outline-none transition focus:border-brand-accent"
                />
              </label>

              <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.18em]">
                <span className={validationError ? "text-brand-warning" : "text-brand-muted"}>
                  {validationError ?? "Minimum 20 characters"}
                </span>
                <span className="font-mono text-brand-muted">{hypothesisLength} chars</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  void handleGenerate();
                }}
                disabled={isGenerating || isSaving}
                className="inline-flex w-full items-center justify-center rounded-full bg-brand-accent px-6 py-3 text-sm font-semibold text-brand-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? currentLoadingMessage : "Generate Variants with Codex ⚡"}
              </button>
            </div>

            <div className="rounded-3xl border border-brand-border bg-brand-bg/60 p-6">
              <p className="font-mono text-xs uppercase tracking-[0.24em] text-brand-muted">
                Preview State
              </p>
              {isGenerating ? (
                <div className="mt-6 rounded-3xl border border-brand-border bg-brand-surface p-6">
                  <p className="font-display text-2xl text-brand-text">{currentLoadingMessage}</p>
                  <p className="mt-3 text-sm text-brand-muted">
                    Codex is building control and treatment variants from your hypothesis.
                  </p>
                </div>
              ) : generatedVariants ? (
                <div className="mt-6 rounded-3xl border border-brand-success/20 bg-brand-success/10 p-6">
                  <p className="font-display text-2xl text-brand-text">Variants generated</p>
                  <p className="mt-3 text-sm text-brand-muted">
                    Review the control plus multiple treatment candidates, choose one, then save as
                    a draft or launch the experiment.
                  </p>
                  <p className="mt-3 text-xs uppercase tracking-[0.2em] text-brand-success">
                    {generatedVariants.target_region} · {generatedVariants.scope_description}
                  </p>
                  {selectedProduct ? (
                    <p className="mt-2 text-sm text-brand-muted">
                      Target product: {selectedProduct.name}
                    </p>
                  ) : null}
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-brand-border p-6">
                  <p className="font-display text-2xl text-brand-text">Waiting for a hypothesis</p>
                  <p className="mt-3 text-sm text-brand-muted">
                    Submit a clear test idea to generate the side-by-side control and treatment
                    concepts.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {errorMessage ? (
          <section className="rounded-3xl border border-brand-warning/30 bg-brand-warning/10 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-2xl text-brand-text">Action blocked</p>
                <p className="mt-2 text-sm text-brand-warning">{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={handleRetry}
                className="rounded-full border border-brand-warning/40 px-5 py-3 text-sm font-semibold text-brand-warning transition hover:bg-brand-warning/10"
              >
                {getRetryLabel(retryAction)}
              </button>
            </div>
          </section>
        ) : null}

        {generatedVariants ? (
          <section className="space-y-6 rounded-3xl border border-brand-border bg-brand-surface p-8 shadow-glow">
            <div className="grid gap-6 lg:grid-cols-2">
              <article className="rounded-3xl border border-brand-border bg-brand-bg/70 p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full border border-brand-border bg-brand-surface px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-brand-muted">
                    Control
                  </span>
                </div>
                <iframe
                  title="Control variant preview"
                  {...(generatedExperimentId
                    ? {
                        src: `/products/${selectedProduct?.slug ?? products[0]?.slug ?? ""}?preview=control&experimentId=${generatedExperimentId}&v=${previewVersion}`,
                      }
                    : {})}
                  className="mt-5 h-[800px] w-full rounded-3xl border border-brand-border bg-white"
                />
                <p className="mt-5 font-mono text-sm leading-7 text-brand-muted">
                  {generatedVariants.control.rationale}
                </p>
              </article>

              <article className="rounded-3xl border border-brand-accent/30 bg-brand-bg/70 p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-brand-accent px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-brand-bg">
                    {selectedTreatment?.label ?? "Treatment"}
                  </span>
                </div>
                <iframe
                  title="Treatment variant preview"
                  {...(generatedExperimentId
                    ? {
                        src: `/products/${selectedProduct?.slug ?? products[0]?.slug ?? ""}?preview=treatment&experimentId=${generatedExperimentId}&v=${previewVersion}`,
                      }
                    : {})}
                  className="mt-5 h-[800px] w-full rounded-3xl border border-brand-border bg-white"
                />
                <p className="mt-5 font-mono text-sm leading-7 text-brand-muted">
                  {selectedTreatment?.rationale}
                </p>
              </article>
            </div>

            {treatmentCandidates.length > 1 ? (
              <div className="grid gap-4 border-t border-brand-border pt-6 lg:grid-cols-3">
                {treatmentCandidates.map((candidate) => {
                  const isSelected = candidate.id === selectedTreatment?.id;

                  return (
                    <article
                      key={candidate.id}
                      className={`rounded-3xl border p-5 transition ${
                        isSelected
                          ? "border-brand-accent bg-brand-accent/10"
                          : "border-brand-border bg-brand-bg/60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-lg font-semibold text-brand-text">{candidate.label}</p>
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                            isSelected
                              ? "bg-brand-accent text-brand-bg"
                              : "border border-brand-border text-brand-muted"
                          }`}
                        >
                          {isSelected ? "Selected" : "Candidate"}
                        </span>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-brand-muted">{candidate.rationale}</p>
                      <button
                        type="button"
                        onClick={() => setSelectedTreatmentId(candidate.id)}
                        className={`mt-5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                          isSelected
                            ? "bg-brand-accent text-brand-bg"
                            : "border border-brand-border text-brand-text hover:border-brand-accent hover:text-brand-accent"
                        }`}
                      >
                        {isSelected ? "Chosen for launch" : "Choose this treatment"}
                      </button>
                    </article>
                  );
                })}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-brand-border pt-6 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  void handleGenerate();
                }}
                disabled={isGenerating || isSaving}
                className="rounded-full border border-brand-border px-5 py-3 text-sm font-semibold text-brand-text transition hover:border-brand-accent hover:text-brand-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                Regenerate ↺
              </button>
              <button
                type="button"
                onClick={() => runMutation(saveDraftAction, "draft")}
                disabled={!canPersist}
                className="rounded-full border border-brand-border px-5 py-3 text-sm font-semibold text-brand-text transition hover:border-brand-accent hover:text-brand-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving && pendingAction === "draft" ? "Saving..." : "Save as Draft"}
              </button>
              <button
                type="button"
                onClick={() => runMutation(launchExperimentAction, "launch")}
                disabled={!canPersist}
                className="rounded-full bg-brand-accent px-5 py-3 text-sm font-semibold text-brand-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving && pendingAction === "launch" ? "Launching..." : "Launch Experiment →"}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
