import type { PageSection, VariantType } from "@/lib/types";

interface DemoVariantSeed {
  id: string;
  html: string;
  rationale: string;
}

interface DemoMetricSeed {
  controlVisits: number;
  controlConversions: number;
  treatmentVisits: number;
  treatmentConversions: number;
}

export interface DemoExperimentSeed {
  id: string;
  name: string;
  hypothesis: string;
  targetRegion: PageSection;
  status: "concluded";
  winner?: VariantType;
  createdAt: string;
  control: DemoVariantSeed;
  treatment: DemoVariantSeed;
  metrics: DemoMetricSeed;
}

/**
 * Frozen demo experiments used to seed a realistic history for the demo merchant account.
 * These variants are generated once, reviewed, and then committed as stable seed data.
 */
export const DEMO_EXPERIMENT_SEEDS: DemoExperimentSeed[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Urgency Under The CTA",
    hypothesis:
      "If we add a low-stock urgency message directly beneath the add-to-cart button, more shoppers will purchase because the product will feel more time-sensitive.",
    targetRegion: "purchase",
    status: "concluded",
    winner: "treatment",
    createdAt: "2026-03-20T14:00:00.000Z",
    control: {
      id: "11111111-1111-4111-8111-111111111112",
      html: `<div class="space-y-4"><div class="flex items-center justify-between"><span class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Size</span><span class="text-xs text-slate-500">Selected: <span data-selected-size>9</span></span></div><div class="grid grid-cols-4 gap-2"><button data-size-option="8" class="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">8</button><button data-size-option="9" data-selected="true" class="rounded-full bg-slate-900 px-3 py-2 text-sm font-medium text-white">9</button><button data-size-option="10" class="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">10</button><button data-size-option="11" class="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">11</button></div><div class="flex items-center justify-between"><span class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Quantity</span><span class="text-xs text-slate-500">Max 10</span></div><div class="flex items-center gap-3"><button data-quantity-action="decrease" class="h-11 w-11 rounded-full border border-slate-300 text-lg font-semibold text-slate-700">-</button><span data-quantity-value class="min-w-[2rem] text-center text-base font-semibold text-slate-900">1</span><button data-quantity-action="increase" class="h-11 w-11 rounded-full border border-slate-300 text-lg font-semibold text-slate-700">+</button></div><button data-primary-cta="true" class="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Add to Cart</button></div>`,
      rationale: "Baseline purchase module with the standard CTA and no urgency copy.",
    },
    treatment: {
      id: "11111111-1111-4111-8111-111111111113",
      html: `<div class="space-y-4"><div class="flex items-center justify-between"><span class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Size</span><span class="text-xs text-slate-500">Selected: <span data-selected-size>9</span></span></div><div class="grid grid-cols-4 gap-2"><button data-size-option="8" class="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">8</button><button data-size-option="9" data-selected="true" class="rounded-full bg-slate-900 px-3 py-2 text-sm font-medium text-white">9</button><button data-size-option="10" class="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">10</button><button data-size-option="11" class="rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700">11</button></div><div class="flex items-center justify-between"><span class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Quantity</span><span class="text-xs text-slate-500">Max 10</span></div><div class="flex items-center gap-3"><button data-quantity-action="decrease" class="h-11 w-11 rounded-full border border-slate-300 text-lg font-semibold text-slate-700">-</button><span data-quantity-value class="min-w-[2rem] text-center text-base font-semibold text-slate-900">1</span><button data-quantity-action="increase" class="h-11 w-11 rounded-full border border-slate-300 text-lg font-semibold text-slate-700">+</button></div><button data-primary-cta="true" class="w-full rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Add to Cart</button><div class="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">Only 12 left in your size. Popular sizes sell out before race weekend.</div></div>`,
      rationale: "Adds credible scarcity directly under the CTA while preserving the existing purchase interaction flow.",
    },
    metrics: {
      controlVisits: 640,
      controlConversions: 47,
      treatmentVisits: 645,
      treatmentConversions: 76,
    },
  },
  {
    id: "22222222-2222-4222-8222-222222222221",
    name: "Shipping Confidence In Trust Band",
    hypothesis:
      "If we emphasize free 2-day shipping and easy returns in the trust band below the purchase controls, conversion rate will increase because shoppers will feel less delivery and return risk.",
    targetRegion: "trust",
    status: "concluded",
    createdAt: "2026-03-17T15:30:00.000Z",
    control: {
      id: "22222222-2222-4222-8222-222222222222",
      html: `<div class="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700 sm:grid-cols-3"><div class="rounded-2xl bg-white px-4 py-3">Free shipping over $150</div><div class="rounded-2xl bg-white px-4 py-3">30-day returns</div><div class="rounded-2xl bg-white px-4 py-3">Secure checkout</div></div>`,
      rationale: "Baseline reassurance row with generic shipping and returns messaging.",
    },
    treatment: {
      id: "22222222-2222-4222-8222-222222222223",
      html: `<div class="grid gap-3 rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm text-slate-800 sm:grid-cols-3"><div class="rounded-2xl bg-white px-4 py-3"><span class="font-semibold text-slate-900">Free 2-day shipping</span><div class="mt-1 text-xs text-slate-500">On this order today</div></div><div class="rounded-2xl bg-white px-4 py-3"><span class="font-semibold text-slate-900">30-day free returns</span><div class="mt-1 text-xs text-slate-500">Try the fit at home</div></div><div class="rounded-2xl bg-white px-4 py-3"><span class="font-semibold text-slate-900">Secure checkout</span><div class="mt-1 text-xs text-slate-500">Encrypted card processing</div></div></div>`,
      rationale: "Makes fulfillment confidence more explicit, but keeps the layout and purchase flow unchanged.",
    },
    metrics: {
      controlVisits: 420,
      controlConversions: 38,
      treatmentVisits: 418,
      treatmentConversions: 41,
    },
  },
  {
    id: "33333333-3333-4333-8333-333333333331",
    name: "Premium Hero Performance Angle",
    hypothesis:
      "If we lead with a premium race-day performance message in the hero instead of a comfort-first framing, more ambitious runners will convert because the product will feel more elite and differentiated.",
    targetRegion: "hero",
    status: "concluded",
    createdAt: "2026-03-13T12:15:00.000Z",
    control: {
      id: "33333333-3333-4333-8333-333333333332",
      html: `<div class="space-y-4"><p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Stridewell Running</p><h1 class="text-4xl font-semibold tracking-tight text-slate-950">ProRunner Elite X</h1><div class="flex items-center gap-2 text-sm text-slate-600"><span class="text-amber-500">★★★★★</span><span>4.5 stars · 247 reviews</span></div><p class="text-3xl font-semibold text-emerald-900">$189.00</p><p class="max-w-xl text-base leading-7 text-slate-600">Lightweight propulsion, race-day cushioning, and a locked-in fit built for runners who want speed without sacrificing comfort.</p></div>`,
      rationale: "Baseline hero balances speed and comfort without over-indexing on elite performance.",
    },
    treatment: {
      id: "33333333-3333-4333-8333-333333333333",
      html: `<div class="space-y-4"><p class="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Stridewell Running</p><h1 class="text-4xl font-semibold tracking-tight text-slate-950">Built For Your Fastest Race Day</h1><div class="flex items-center gap-2 text-sm text-slate-600"><span class="text-amber-500">★★★★★</span><span>4.5 stars · 247 reviews</span></div><p class="text-3xl font-semibold text-emerald-900">$189.00</p><p class="max-w-xl text-base leading-7 text-slate-600">Ultra-responsive propulsion, elite race geometry, and an aggressive feel designed to shave seconds when every split matters.</p></div>`,
      rationale: "Pushes a more elite and aggressive hero message to test whether ambition beats comfort-first framing.",
    },
    metrics: {
      controlVisits: 560,
      controlConversions: 62,
      treatmentVisits: 558,
      treatmentConversions: 48,
    },
  },
];
