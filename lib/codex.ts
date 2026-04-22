import "server-only";

import { Codex } from "@openai/codex-sdk";
import { formatPrice } from "./storefront";
import {
  type ExperimentSummaryContext,
  type ExperimentSummaryHistoryItem,
  type ExperimentSummaryReport,
  type ExperimentSummaryRecommendation,
  type Product,
  VariantGenerationError,
  type GeneratedTreatmentCandidate,
  type PageSection,
  type VariantGenerationResult,
} from "./types";

type RequiredVariantField = "control.html" | "control.rationale" | "treatment.html" | "treatment.rationale";

interface GenerationPlanPayload {
  target_region?: string;
  hypothesis_interpretation?: string;
  scope_description?: string;
  control?: {
    html?: string;
    rationale?: string;
  };
}

interface TreatmentPayload {
  treatment?: {
    html?: string;
    rationale?: string;
  };
}

interface SummarySelectionPayload {
  experiment_ids?: string[];
  focus_areas?: string[];
  analysis_goal?: string;
}

interface SummaryReportPayload {
  headline?: string;
  summary?: string;
  findings?: string[];
  recommendations?: Array<{
    title?: string;
    rationale?: string;
    hypothesis?: string;
    priority?: string;
  }>;
}

interface TreatmentStyle {
  id: string;
  label: string;
  instruction: string;
}

interface HtmlValidationResult {
  valid: boolean;
  reason?: string;
}

const TREATMENT_STYLES: TreatmentStyle[] = [
  {
    id: "conservative",
    label: "Conservative",
    instruction:
      "Create a lower-risk treatment with subtle but meaningful changes to hierarchy, copy emphasis, or layout.",
  },
  {
    id: "balanced",
    label: "Balanced",
    instruction:
      "Create a clearly differentiated treatment that is hypothesis-driven but still believable for a polished ecommerce brand.",
  },
  {
    id: "bold",
    label: "Bold",
    instruction:
      "Create the strongest treatment you can justify for this hypothesis, using a more assertive change in presentation, emphasis, or structure.",
  },
] as const;

function getOpenAiApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new VariantGenerationError("Missing OpenAI API key.");
  }

  return apiKey;
}

function stringifyList(values: string[]): string {
  return values.join(", ");
}

function getRegionGuide(): string {
  return `The available regions are:
- hero: brand kicker, product name, star rating, review count, price, short description
- images: main display card plus product gallery thumbnails
- purchase: product option selectors, quantity control, primary CTA button
- trust: reassurance band for shipping, returns, support, or credibility copy
- social_proof: customer review cards section
- recommendations: companion or add-on product cards
- layout: the full above-fold area only, combining images on one side and hero + purchase + trust on the other`;
}

function getPurchaseGuide(product: Product): string {
  const optionGroups = product.storefront.option_groups
    .map(
      (group) =>
        `  - ${group.label} (id: ${group.id}): ${stringifyList(group.values)}; default ${group.selected_value}`
    )
    .join("\n");

  return `Purchase configuration:
- Option groups:
${optionGroups}
- Quantity label: ${product.storefront.quantity_selector.label}
- Quantity helper: ${product.storefront.quantity_selector.helper_text}
- Quantity range: ${product.storefront.quantity_selector.min} to ${product.storefront.quantity_selector.max}
- Primary CTA baseline label: ${product.storefront.primary_cta_label}`;
}

function getGalleryGuide(product: Product): string {
  return `Gallery items:
${product.storefront.gallery_items
  .map(
    (item) =>
      `- ${item.id}: ${item.label} (${item.accent}) using panel classes ${item.panel_class_name}`
  )
  .join("\n")}`;
}

function getStorefrontGuide(product: Product): string {
  return `Use this exact storefront content:
- Brand kicker: ${product.storefront.hero_kicker}
- Product name: ${product.name}
- Rating: ${product.rating.toFixed(1)} stars, ${product.review_count} reviews
- Price: ${formatPrice(product.price_cents)}
- Description: ${product.description}

${getGalleryGuide(product)}

${getPurchaseGuide(product)}

Trust items:
${product.storefront.trust_items
  .map((item) => `- ${item.title}${item.detail ? `: ${item.detail}` : ""}`)
  .join("\n")}

Reviews section:
- Heading: ${product.storefront.reviews_heading}
- Subheading: ${product.storefront.reviews_subheading}
${product.storefront.reviews
  .map((review) => `- ${review.name} ${review.rating_label}: ${review.body}`)
  .join("\n")}

Recommendations section:
- Heading: ${product.storefront.recommendations_heading}
- Subheading: ${product.storefront.recommendations_subheading}
${product.storefront.recommendations
  .map(
    (recommendation) =>
      `- ${recommendation.name} — ${formatPrice(recommendation.price_cents)}: ${recommendation.description}`
  )
  .join("\n")}

Visual reference:
- images region:
  - large rounded product card with a gradient background
  - product name centered in the main panel
  - gallery label shown near the bottom
  - thumbnail cards in a horizontal strip with visible selected state
- hero region:
  - small caps brand or category kicker
  - large bold product name
  - star rating with review count
  - price in large bold type
  - one-line product description
- purchase region:
  - one block per option group, each with selected value summary
  - quantity selector with helper text
  - full-width dark primary CTA
- trust region:
  - reassurance cards or band using the trust items above
- social_proof region:
  - review cards with reviewer name, rating, and review text
- recommendations region:
  - recommendation cards with a small gradient image block, product name, short copy, and price
- layout region:
  - ALWAYS render a horizontal two-column above-fold layout
  - use class="w-full grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 items-start"
  - one column is the image gallery and the other is hero + purchase + trust`;
}

function getRenderingRules(product: Product): string {
  const optionContract = product.storefront.option_groups
    .map(
      (group) =>
        `  - ${group.label}: buttons use data-option-group="${group.id}" and data-option-value="${group.values.join("|")}"; include one text element with data-selected-option="${group.id}"; exactly one option in this group should start with data-selected="true"`
    )
    .join("\n");
  const galleryIds = product.storefront.gallery_items.map((item) => item.id).join("|");

  return `Rules:
- Use only Tailwind CSS classes
- The HTML must be self-contained and work inside an iframe with Tailwind CDN loaded
- Make the region responsive for laptop and mobile widths
- Prefer responsive classes like text-sm sm:text-base lg:text-lg, p-4 sm:p-5 lg:p-6, gap-3 sm:gap-4 lg:gap-6
- Avoid oversized typography or spacing that makes the region feel zoomed-in on 13-15 inch laptop screens
- Keep primary CTAs and urgency modules fully visible without needing browser zoom changes
- Do not use placeholder boxes, lorem ipsum, or generic mock copy
- Keep all real product content and labels intact unless the hypothesis specifically changes emphasis, order, or supporting copy
- For purchase or layout regions, include exactly one primary purchase CTA marked with data-primary-cta="true"
- Only the real purchase CTA may use data-primary-cta="true"
- Secondary buttons, tabs, thumbnails, quantity steppers, and links must never use data-primary-cta="true"
- The primary CTA must have a visible label and be the only conversion trigger in the generated HTML
- For purchase or layout regions, use this exact interaction contract so the embedded runtime can make the UI functional:
${optionContract}
  - quantity decrement button: data-quantity-action="decrease"
  - quantity increment button: data-quantity-action="increase"
  - quantity value element: data-quantity-value
  - keep the quantity range within ${product.storefront.quantity_selector.min} to ${product.storefront.quantity_selector.max}
- For images or layout regions, use this exact gallery contract:
  - thumbnail buttons: data-gallery-option="${galleryIds}"
  - exactly one thumbnail should start with data-selected="true"
  - main display label element: data-gallery-label
  - main display panel element: data-gallery-panel
  - optional accent orb element: data-gallery-orb
- Do not rely on framework code, React, or external scripts for interactivity; the generated HTML must follow the data-attribute contract exactly`;
}

function buildPlanPrompt(hypothesis: string, product: Product): string {
  return `You are a senior conversion rate optimization engineer.

Your job is to identify the ONE page region most directly tested by a hypothesis, then generate the
baseline control HTML for that region only.

${getRegionGuide()}

Hypothesis: "${hypothesis}"
Product: ${product.name}, ${formatPrice(product.price_cents)}, ${product.category_label}

${getStorefrontGuide(product)}

${getRenderingRules(product)}

Planning rules:
- Choose the ONE region most directly tested by the hypothesis
- Generate the FULL control HTML for that chosen region only
- The control should faithfully represent the current product baseline for that region
- Do not generate the treatment in this step

Return ONLY valid JSON:
{
  "target_region": "purchase",
  "hypothesis_interpretation": "one sentence describing the real test",
  "scope_description": "what part of the page is being replaced",
  "control": {
    "html": "<full HTML for the control version of the chosen region>",
    "rationale": "why this is the baseline"
  }
}`;
}

function buildTreatmentPrompt(
  hypothesis: string,
  product: Product,
  plan: {
    targetRegion: PageSection;
    hypothesisInterpretation: string;
    scopeDescription: string;
    controlHtml: string;
  },
  style: TreatmentStyle
): string {
  return `You are a senior conversion rate optimization engineer.

Generate ONE treatment candidate for an ecommerce A/B test.

Hypothesis: "${hypothesis}"
Target region: "${plan.targetRegion}"
Hypothesis interpretation: "${plan.hypothesisInterpretation}"
Scope description: "${plan.scopeDescription}"
Treatment style: "${style.label}"
Style instruction: ${style.instruction}

${getRegionGuide()}

${getStorefrontGuide(product)}

Current control HTML for the chosen region:
${plan.controlHtml}

${getRenderingRules(product)}

Treatment rules:
- Generate ONLY the treatment HTML for the chosen region
- Keep the same region as the control
- Directly test the hypothesis, not generic conversion fluff
- Make this candidate distinct from a typical baseline in a ${style.label.toLowerCase()} way
- Do not return control HTML in this step
- Do not return a full HTML document

Return ONLY valid JSON:
{
  "treatment": {
    "html": "<full HTML for the treatment version of the chosen region>",
    "rationale": "what changed and why it tests the hypothesis in a ${style.label.toLowerCase()} way"
  }
}`;
}

function buildSummarySelectionPrompt(history: ExperimentSummaryHistoryItem[]): string {
  return `You are a senior experimentation analyst reviewing a merchant's past A/B tests.

You will receive a compact list of the merchant's live and concluded experiments. Your job is to
choose which experiments deserve deeper inspection before you write the final report.

Return ONLY valid JSON:
{
  "experiment_ids": ["id-1", "id-2"],
  "focus_areas": ["short phrase", "short phrase"],
  "analysis_goal": "one sentence"
}

Rules:
- Choose up to 5 experiment_ids.
- Prefer experiments with meaningful traffic, notable uplift, strong confidence, surprising losses, or repeated themes.
- Include a mix of winners and underperformers when possible.
- Only choose ids from the list below.

Experiment history:
${JSON.stringify(history, null, 2)}`;
}

function buildSummaryReportPrompt(
  history: ExperimentSummaryHistoryItem[],
  contexts: ExperimentSummaryContext[]
): string {
  return `You are a senior experimentation analyst for an ecommerce growth team.

You have already reviewed the merchant's experiment history and requested detailed context for the
most relevant experiments. Produce a concise executive summary and concrete next-test recommendations.

Compact history:
${JSON.stringify(history, null, 2)}

Detailed experiment context:
${JSON.stringify(contexts, null, 2)}

Return ONLY valid JSON:
{
  "headline": "short title",
  "summary": "2-4 sentence executive summary grounded in the data",
  "findings": [
    "specific pattern grounded in hypotheses, metrics, or confidence"
  ],
  "recommendations": [
    {
      "title": "short recommendation title",
      "rationale": "why this follows from the experiment history",
      "hypothesis": "a concrete next hypothesis to test",
      "priority": "high"
    }
  ]
}

Rules:
- Be evidence-based. Reference outcomes, confidence, sample sizes, regions, and recurring themes.
- Distinguish strong signals from weak or inconclusive data.
- Recommendations must be specific, testable, and useful to a merchant.
- Keep the output concise and scannable.
- Priority must be one of: high, medium, low.
- Provide 2 to 4 recommendations.`;
}

function stripMarkdownFences(responseText: string): string {
  return responseText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

function parseJson<T>(responseText: string): T {
  try {
    return JSON.parse(stripMarkdownFences(responseText)) as T;
  } catch {
    throw new VariantGenerationError("Failed to parse variant generation response JSON.");
  }
}

function parseTargetRegion(value: string): PageSection {
  const regions: PageSection[] = [
    "hero",
    "images",
    "purchase",
    "trust",
    "social_proof",
    "recommendations",
    "layout",
  ];

  if (regions.includes(value as PageSection)) {
    return value as PageSection;
  }

  throw new VariantGenerationError(`Invalid target_region: ${value}`);
}

function readVariantField(
  payload: {
    control?: { html?: string; rationale?: string };
    treatment?: { html?: string; rationale?: string };
  },
  field: RequiredVariantField
): string {
  const [group, key] = field.split(".") as ["control" | "treatment", "html" | "rationale"];
  const value = payload[group]?.[key];

  if (!value) {
    throw new VariantGenerationError(`Missing required field: ${field}`);
  }

  return value;
}

function parseGenerationPlan(responseText: string): {
  targetRegion: PageSection;
  hypothesisInterpretation: string;
  scopeDescription: string;
  control: {
    html: string;
    rationale: string;
  };
} {
  const payload = parseJson<GenerationPlanPayload>(responseText);
  const targetRegion = parseTargetRegion(payload.target_region ?? "purchase");

  return {
    targetRegion,
    hypothesisInterpretation:
      payload.hypothesis_interpretation ??
      "Tests whether redesigning the selected page region improves conversion.",
    scopeDescription: payload.scope_description ?? `${targetRegion} section`,
    control: {
      html: readVariantField(payload, "control.html"),
      rationale: readVariantField(payload, "control.rationale"),
    },
  };
}

function countPrimaryCtas(html: string): number {
  const matches = html.match(/data-primary-cta\s*=\s*["']true["']/gi);

  return matches ? matches.length : 0;
}

function countMatches(html: string, pattern: RegExp): number {
  const matches = html.match(pattern);

  return matches ? matches.length : 0;
}

function validatePurchaseContract(
  targetRegion: PageSection,
  html: string,
  product: Product
): HtmlValidationResult {
  const optionButtonCount = countMatches(html, /data-option-group\s*=\s*["'][^"']+["']/gi);
  const selectedLabelCount = countMatches(html, /data-selected-option\s*=\s*["'][^"']+["']/gi);
  const quantityValueCount = countMatches(html, /data-quantity-value(?:\s|=|>)/gi);
  const quantityControlCount = countMatches(html, /data-quantity-action\s*=\s*["'](increase|decrease)["']/gi);
  const selectedOptionCount = countMatches(html, /data-selected\s*=\s*["']true["']/gi);
  const expectedOptionCount = product.storefront.option_groups.reduce(
    (count, group) => count + group.values.length,
    0
  );

  if (optionButtonCount < expectedOptionCount) {
    return {
      valid: false,
      reason: `${targetRegion} regions must include buttons marked with data-option-group for every product option.`,
    };
  }

  if (selectedLabelCount !== product.storefront.option_groups.length) {
    return {
      valid: false,
      reason: `${targetRegion} regions must include exactly one data-selected-option label for each option group.`,
    };
  }

  if (quantityValueCount !== 1) {
    return {
      valid: false,
      reason: `${targetRegion} regions must include exactly one data-quantity-value element.`,
    };
  }

  if (quantityControlCount < 2) {
    return {
      valid: false,
      reason: `${targetRegion} regions must include quantity controls marked with data-quantity-action.`,
    };
  }

  if (selectedOptionCount < 1) {
    return {
      valid: false,
      reason: `${targetRegion} regions must mark an initial selection with data-selected="true".`,
    };
  }

  for (const group of product.storefront.option_groups) {
    if (!html.includes(`data-option-group="${group.id}"`)) {
      return {
        valid: false,
        reason: `${targetRegion} regions must include option buttons for the ${group.label} group.`,
      };
    }

    if (!html.includes(`data-selected-option="${group.id}"`)) {
      return {
        valid: false,
        reason: `${targetRegion} regions must include a selected-value label for the ${group.label} group.`,
      };
    }
  }

  return { valid: true };
}

function validateGalleryContract(
  targetRegion: PageSection,
  html: string,
  product: Product
): HtmlValidationResult {
  const galleryOptionCount = countMatches(html, /data-gallery-option\s*=\s*["'][^"']+["']/gi);
  const galleryLabelCount = countMatches(html, /data-gallery-label(?:\s|=|>)/gi);
  const galleryPanelCount = countMatches(html, /data-gallery-panel(?:\s|=|>)/gi);

  if (galleryOptionCount < product.storefront.gallery_items.length) {
    return {
      valid: false,
      reason: `${targetRegion} regions must include gallery thumbnails marked with data-gallery-option for each gallery item.`,
    };
  }

  if (galleryLabelCount !== 1) {
    return {
      valid: false,
      reason: `${targetRegion} regions must include exactly one data-gallery-label element.`,
    };
  }

  if (galleryPanelCount !== 1) {
    return {
      valid: false,
      reason: `${targetRegion} regions must include exactly one data-gallery-panel element.`,
    };
  }

  return { valid: true };
}

function validateRegionHtml(
  targetRegion: PageSection,
  html: string,
  product: Product
): HtmlValidationResult {
  const primaryCtaCount = countPrimaryCtas(html);
  const requiresPrimaryCta = targetRegion === "purchase" || targetRegion === "layout";

  if (requiresPrimaryCta && primaryCtaCount !== 1) {
    return {
      valid: false,
      reason: `Expected exactly one primary CTA marker, found ${primaryCtaCount}.`,
    };
  }

  if (!requiresPrimaryCta && primaryCtaCount !== 0) {
    return {
      valid: false,
      reason: "Only purchase and layout regions may include a primary CTA marker.",
    };
  }

  if (targetRegion === "purchase" || targetRegion === "layout") {
    const purchaseValidation = validatePurchaseContract(targetRegion, html, product);

    if (!purchaseValidation.valid) {
      return purchaseValidation;
    }
  }

  if (targetRegion === "images" || targetRegion === "layout") {
    const galleryValidation = validateGalleryContract(targetRegion, html, product);

    if (!galleryValidation.valid) {
      return galleryValidation;
    }
  }

  return { valid: true };
}

function parseTreatmentCandidate(
  responseText: string,
  style: TreatmentStyle
): GeneratedTreatmentCandidate {
  const payload = parseJson<TreatmentPayload>(responseText);

  return {
    id: style.id,
    label: style.label,
    html: readVariantField(payload, "treatment.html"),
    rationale: readVariantField(payload, "treatment.rationale"),
  };
}

function parseSummarySelection(responseText: string): SummarySelectionPayload {
  const payload = parseJson<SummarySelectionPayload>(responseText);

  return {
    experiment_ids: Array.isArray(payload.experiment_ids)
      ? payload.experiment_ids.filter((value): value is string => typeof value === "string")
      : [],
    focus_areas: Array.isArray(payload.focus_areas)
      ? payload.focus_areas.filter((value): value is string => typeof value === "string")
      : [],
    analysis_goal:
      typeof payload.analysis_goal === "string"
        ? payload.analysis_goal
        : "Review the merchant's recent experiment performance and identify the most important learnings.",
  };
}

function parseSummaryRecommendations(
  recommendations: SummaryReportPayload["recommendations"]
): ExperimentSummaryRecommendation[] {
  if (!Array.isArray(recommendations) || recommendations.length === 0) {
    throw new VariantGenerationError("Missing required field: recommendations");
  }

  return recommendations
    .map((recommendation): ExperimentSummaryRecommendation => {
      let priority: ExperimentSummaryRecommendation["priority"] = "medium";

      if (
        recommendation.priority === "high" ||
        recommendation.priority === "medium" ||
        recommendation.priority === "low"
      ) {
        priority = recommendation.priority;
      }

      return {
        title: recommendation.title?.trim() ?? "",
        rationale: recommendation.rationale?.trim() ?? "",
        hypothesis: recommendation.hypothesis?.trim() ?? "",
        priority,
      };
    })
    .filter(
      (recommendation) =>
        recommendation.title &&
        recommendation.rationale &&
        recommendation.hypothesis
    );
}

function parseSummaryReport(responseText: string): ExperimentSummaryReport {
  const payload = parseJson<SummaryReportPayload>(responseText);

  if (!payload.headline?.trim()) {
    throw new VariantGenerationError("Missing required field: headline");
  }

  if (!payload.summary?.trim()) {
    throw new VariantGenerationError("Missing required field: summary");
  }

  if (!Array.isArray(payload.findings) || payload.findings.length === 0) {
    throw new VariantGenerationError("Missing required field: findings");
  }

  const findings = payload.findings.filter(
    (finding): finding is string => typeof finding === "string" && Boolean(finding.trim())
  );

  if (findings.length === 0) {
    throw new VariantGenerationError("Missing required field: findings");
  }

  const recommendations = parseSummaryRecommendations(payload.recommendations);

  if (recommendations.length === 0) {
    throw new VariantGenerationError("Missing required field: recommendations");
  }

  return {
    headline: payload.headline.trim(),
    summary: payload.summary.trim(),
    findings,
    recommendations,
  };
}

async function runCodexPrompt(prompt: string): Promise<string> {
  const codex = new Codex({ apiKey: getOpenAiApiKey() });
  const thread = codex.startThread({
    skipGitRepoCheck: true,
  });
  const result = (await thread.run(prompt)) as { finalResponse?: string } | string;

  if (typeof result === "string") {
    return result;
  }

  if (typeof result.finalResponse === "string") {
    return result.finalResponse;
  }

  return JSON.stringify(result);
}

async function generatePlanWithRetry(hypothesis: string, product: Product): Promise<{
  targetRegion: PageSection;
  hypothesisInterpretation: string;
  scopeDescription: string;
  control: {
    html: string;
    rationale: string;
  };
}> {
  let prompt = buildPlanPrompt(hypothesis, product);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const plan = parseGenerationPlan(await runCodexPrompt(prompt));
    const validation = validateRegionHtml(plan.targetRegion, plan.control.html, product);

    if (validation.valid) {
      return plan;
    }

    prompt = `${buildPlanPrompt(hypothesis, product)}

Correction for retry:
- The previous control HTML was invalid: ${validation.reason}
- Fix the CTA contract exactly.`;
  }

  throw new VariantGenerationError("Unable to generate a valid control region with a strict CTA contract.");
}

async function generateTreatmentCandidateWithRetry(
  hypothesis: string,
  product: Product,
  plan: {
    targetRegion: PageSection;
    hypothesisInterpretation: string;
    scopeDescription: string;
    controlHtml: string;
  },
  style: TreatmentStyle
): Promise<GeneratedTreatmentCandidate> {
  let prompt = buildTreatmentPrompt(hypothesis, product, plan, style);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const candidate = parseTreatmentCandidate(await runCodexPrompt(prompt), style);
    const validation = validateRegionHtml(plan.targetRegion, candidate.html, product);

    if (validation.valid) {
      return candidate;
    }

    prompt = `${buildTreatmentPrompt(hypothesis, product, plan, style)}

Correction for retry:
- The previous treatment HTML was invalid: ${validation.reason}
- Fix the CTA contract exactly.`;
  }

  throw new VariantGenerationError(
    `Unable to generate a valid ${style.label.toLowerCase()} treatment with a strict CTA contract.`
  );
}

/**
 * Generates one control region and multiple parallel treatment candidates for a hypothesis.
 *
 * @param hypothesis - Plain English description of what is being tested.
 * @param product - Product data grounding the generated variants.
 * @returns Typed object with the chosen region, shared control, and multiple treatment candidates.
 * @throws {VariantGenerationError} If any Codex response is malformed or generation fails.
 */
export async function generateVariants(
  hypothesis: string,
  product: Product
): Promise<VariantGenerationResult> {
  if (!hypothesis.trim()) {
    throw new VariantGenerationError("Hypothesis is required");
  }

  try {
    const plan = await generatePlanWithRetry(hypothesis, product);
    const treatments = await Promise.all(
      TREATMENT_STYLES.map(async (style) =>
        generateTreatmentCandidateWithRetry(
          hypothesis,
          product,
          {
            targetRegion: plan.targetRegion,
            hypothesisInterpretation: plan.hypothesisInterpretation,
            scopeDescription: plan.scopeDescription,
            controlHtml: plan.control.html,
          },
          style
        )
      )
    );

    const primaryTreatment = treatments[0];
    const result = {
      control: plan.control,
      treatment: {
        html: primaryTreatment.html,
        rationale: primaryTreatment.rationale,
      },
    } as VariantGenerationResult;

    Object.defineProperties(result, {
      target_region: {
        value: plan.targetRegion,
        enumerable: false,
        writable: true,
        configurable: true,
      },
      hypothesis_interpretation: {
        value: plan.hypothesisInterpretation,
        enumerable: false,
        writable: true,
        configurable: true,
      },
      scope_description: {
        value: plan.scopeDescription,
        enumerable: false,
        writable: true,
        configurable: true,
      },
      treatments: {
        value: treatments,
        enumerable: false,
        writable: true,
        configurable: true,
      },
    });

    return result;
  } catch (error) {
    if (error instanceof VariantGenerationError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown Codex SDK failure.";

    throw new VariantGenerationError(`Variant generation failed: ${message}`);
  }
}

/**
 * Generates a Codex-written summary and recommendations based on prior experiment performance.
 *
 * @param history - Compact history rows for the merchant's live and concluded experiments.
 * @param loadContext - Read-only callback that returns detailed context for one experiment.
 * @returns A structured experiment summary report.
 * @throws {VariantGenerationError} If Codex returns malformed analysis output.
 */
export async function generateExperimentSummary(
  history: ExperimentSummaryHistoryItem[],
  loadContext: (experimentId: string) => Promise<ExperimentSummaryContext>
): Promise<ExperimentSummaryReport> {
  if (history.length === 0) {
    throw new VariantGenerationError("No experiment history available to summarize.");
  }

  try {
    const selection = parseSummarySelection(
      await runCodexPrompt(buildSummarySelectionPrompt(history))
    );
    const selectedIds = Array.from(
      new Set(
        (selection.experiment_ids ?? []).filter((experimentId) =>
          history.some((experiment) => experiment.experiment_id === experimentId)
        )
      )
    ).slice(0, 5);
    const fallbackIds = history.slice(0, Math.min(history.length, 5)).map((item) => item.experiment_id);
    const contextIds = selectedIds.length > 0 ? selectedIds : fallbackIds;
    const contexts = await Promise.all(contextIds.map((experimentId) => loadContext(experimentId)));

    return parseSummaryReport(await runCodexPrompt(buildSummaryReportPrompt(history, contexts)));
  } catch (error) {
    if (error instanceof VariantGenerationError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown Codex SDK failure.";
    throw new VariantGenerationError(`Experiment summary failed: ${message}`);
  }
}
