import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSeedStorefrontContent } from "@/lib/storefront";
import type { ExperimentSummaryContext, ExperimentSummaryHistoryItem, Product } from "@/lib/types";

const runMock = vi.fn();
const startThreadMock = vi.fn(() => ({
  run: runMock,
}));

vi.mock("server-only", () => ({}));

vi.mock("@openai/codex-sdk", () => ({
  Codex: vi.fn(() => ({
    startThread: startThreadMock,
  })),
}));

const CONTROL_PURCHASE_HTML =
  '<div><span data-selected-option="size">9</span><button data-option-group="size" data-option-value="8">8</button><button data-option-group="size" data-option-value="9" data-selected="true">9</button><button data-option-group="size" data-option-value="10">10</button><button data-option-group="size" data-option-value="11">11</button><button data-quantity-action="decrease">-</button><span data-quantity-value>1</span><button data-quantity-action="increase">+</button><button data-primary-cta="true">Control</button></div>';

function createTreatmentHtml(label: string): string {
  return `<div><span data-selected-option="size">9</span><button data-option-group="size" data-option-value="8">8</button><button data-option-group="size" data-option-value="9" data-selected="true">9</button><button data-option-group="size" data-option-value="10">10</button><button data-option-group="size" data-option-value="11">11</button><button data-quantity-action="decrease">-</button><span data-quantity-value>1</span><button data-quantity-action="increase">+</button><button data-primary-cta="true">${label}</button></div>`;
}

const TEST_PRODUCT: Product = {
  id: "product-id",
  slug: "pro-runner-elite-x",
  brand: "Stridewell",
  category_label: "Stridewell Running",
  name: "ProRunner Elite X",
  description:
    "Lightweight propulsion, race-day cushioning, and a locked-in fit built for runners who want speed without sacrificing comfort.",
  price_cents: 18900,
  rating: 4.5,
  review_count: 247,
  status: "active",
  storefront: createSeedStorefrontContent({
    brand: "Stridewell",
    category_label: "Stridewell Running",
    name: "ProRunner Elite X",
    description:
      "Lightweight propulsion, race-day cushioning, and a locked-in fit built for runners who want speed without sacrificing comfort.",
    price_cents: 18900,
  }),
  created_at: "2026-01-01T00:00:00.000Z",
};

const SUMMARY_HISTORY: ExperimentSummaryHistoryItem[] = [
  {
    experiment_id: "exp-1",
    experiment_name: "Urgency under CTA",
    hypothesis: "Add urgency under the CTA",
    product_name: "ProRunner Elite X",
    product_slug: "pro-runner-elite-x",
    status: "concluded",
    target_region: "purchase",
    created_at: "2026-01-02T00:00:00.000Z",
    winner: "treatment",
    total_visitors: 1200,
    total_conversions: 130,
    control_cvr: 0.08,
    treatment_cvr: 0.136,
    uplift_percentage: 70,
    confidence: 97,
  },
];

const SUMMARY_CONTEXT: ExperimentSummaryContext = {
  ...SUMMARY_HISTORY[0],
  control_visits: 600,
  control_conversions: 48,
  treatment_visits: 600,
  treatment_conversions: 82,
  control_rationale: "Baseline purchase module.",
  treatment_rationale: "Adds urgency and reassurance beneath the CTA.",
};

describe("generateVariants", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("returns an object with all four required fields", async () => {
    runMock
      .mockResolvedValueOnce({
        finalResponse: JSON.stringify({
          target_region: "purchase",
          control: {
            html: CONTROL_PURCHASE_HTML,
            rationale: "Baseline",
          },
        }),
      })
      .mockResolvedValueOnce({
        finalResponse: JSON.stringify({
          treatment: {
            html: createTreatmentHtml("Conservative"),
            rationale: "Conservative treatment",
          },
        }),
      })
      .mockResolvedValueOnce({
        finalResponse: JSON.stringify({
          treatment: {
            html: createTreatmentHtml("Balanced"),
            rationale: "Balanced treatment",
          },
        }),
      })
      .mockResolvedValueOnce({
        finalResponse: JSON.stringify({
          treatment: {
            html: createTreatmentHtml("Bold"),
            rationale: "Bold treatment",
          },
        }),
      });

    const { generateVariants } = await import("../../lib/codex");
    const result = await generateVariants("Test a stronger CTA", TEST_PRODUCT);

    expect(result).toEqual({
      control: {
        html: CONTROL_PURCHASE_HTML,
        rationale: "Baseline",
      },
      treatment: {
        html: createTreatmentHtml("Conservative"),
        rationale: "Conservative treatment",
      },
    });
  });

  it("produces different treatment html for different hypotheses", async () => {
    runMock.mockImplementation(async (prompt: string) => {
      const hypothesisMatch = prompt.match(/Hypothesis: "([^"]+)"/);
      const hypothesis = hypothesisMatch?.[1] ?? "unknown";

      if (prompt.includes("Do not generate the treatment in this step")) {
        return {
          finalResponse: JSON.stringify({
            target_region: "purchase",
            control: {
              html: CONTROL_PURCHASE_HTML,
              rationale: "Baseline",
            },
          }),
        };
      }

      return {
        finalResponse: JSON.stringify({
          treatment: {
            html: createTreatmentHtml(hypothesis),
            rationale: `Treatment for ${hypothesis}`,
          },
        }),
      };
    });

    const { generateVariants } = await import("../../lib/codex");
    const firstResult = await generateVariants("Emphasize urgency", TEST_PRODUCT);
    const secondResult = await generateVariants("Highlight free shipping", TEST_PRODUCT);

    expect(firstResult.treatment.html).not.toBe(secondResult.treatment.html);
  });

  it("throws VariantGenerationError for malformed JSON", async () => {
    runMock.mockResolvedValueOnce({
      finalResponse: "{invalid json",
    });

    const { generateVariants } = await import("../../lib/codex");

    await expect(generateVariants("Test malformed response", TEST_PRODUCT)).rejects.toMatchObject({
      name: "VariantGenerationError",
      message: "Failed to parse variant generation response JSON.",
    });
  });

  it("throws validation error before the SDK is called for an empty hypothesis", async () => {
    const { generateVariants } = await import("../../lib/codex");

    await expect(generateVariants("   ", TEST_PRODUCT)).rejects.toThrow("Hypothesis is required");
    expect(startThreadMock).not.toHaveBeenCalled();
    expect(runMock).not.toHaveBeenCalled();
  });
});

describe("generateExperimentSummary", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
  });

  it("returns a structured report after selecting experiment context", async () => {
    const loadContext = vi.fn().mockResolvedValue(SUMMARY_CONTEXT);

    runMock
      .mockResolvedValueOnce({
        finalResponse: JSON.stringify({
          experiment_ids: ["exp-1"],
          focus_areas: ["winning purchase tests"],
          analysis_goal: "Review winning purchase-region patterns.",
        }),
      })
      .mockResolvedValueOnce({
        finalResponse: JSON.stringify({
          headline: "Purchase messaging is the strongest lever.",
          summary:
            "Purchase-region tests consistently outperform baseline when they add urgency and reassurance together.",
          findings: [
            "The highest-confidence win focused on purchase messaging and produced strong uplift.",
          ],
          recommendations: [
            {
              title: "Test shipping reassurance with urgency",
              rationale: "The strongest performer paired action-driving urgency with a confidence cue.",
              hypothesis:
                "Adding a 2-day shipping reassurance line directly below the CTA will increase conversions.",
              priority: "high",
            },
          ],
        }),
      });

    const { generateExperimentSummary } = await import("../../lib/codex");
    const result = await generateExperimentSummary(SUMMARY_HISTORY, loadContext);

    expect(loadContext).toHaveBeenCalledWith("exp-1");
    expect(result).toEqual({
      headline: "Purchase messaging is the strongest lever.",
      summary:
        "Purchase-region tests consistently outperform baseline when they add urgency and reassurance together.",
      findings: [
        "The highest-confidence win focused on purchase messaging and produced strong uplift.",
      ],
      recommendations: [
        {
          title: "Test shipping reassurance with urgency",
          rationale: "The strongest performer paired action-driving urgency with a confidence cue.",
          hypothesis:
            "Adding a 2-day shipping reassurance line directly below the CTA will increase conversions.",
          priority: "high",
        },
      ],
    });
  });
});
