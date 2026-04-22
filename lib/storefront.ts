import type {
  Product,
  ProductGalleryItem,
  ProductOptionGroup,
  ProductQuantitySelector,
  ProductRecommendation,
  ProductReview,
  ProductStorefrontContent,
  ProductTrustItem,
} from "@/lib/types";

type ProductSeedShape = Pick<
  Product,
  "brand" | "category_label" | "name" | "description" | "price_cents"
> & {
  storefront?: Partial<ProductStorefrontContent> | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readStringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const values = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));

  return values.length > 0 ? values : fallback;
}

function slugifyValue(value: string, fallback: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

function buildDefaultGalleryItems(): ProductGalleryItem[] {
  return [
    {
      id: "dawn",
      label: "Warm detail view",
      accent: "DAWN",
      panel_class_name: "from-orange-100 via-amber-50 to-white",
      orb_class_name: "from-orange-400 to-amber-300",
    },
    {
      id: "sky",
      label: "Cool studio view",
      accent: "SKY",
      panel_class_name: "from-sky-100 via-cyan-50 to-white",
      orb_class_name: "from-sky-500 to-cyan-300",
    },
    {
      id: "forest",
      label: "Lifestyle texture view",
      accent: "FOREST",
      panel_class_name: "from-emerald-100 via-lime-50 to-white",
      orb_class_name: "from-emerald-500 to-lime-300",
    },
    {
      id: "graphite",
      label: "Neutral close-up view",
      accent: "GRAPHITE",
      panel_class_name: "from-slate-300 via-slate-100 to-white",
      orb_class_name: "from-slate-800 to-slate-500",
    },
  ];
}

function normalizeGalleryItems(value: unknown): ProductGalleryItem[] {
  const fallback = buildDefaultGalleryItems();

  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map((item, index): ProductGalleryItem | null => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        id: readString(item.id, fallback[index]?.id ?? `gallery-${index + 1}`),
        label: readString(item.label, fallback[index]?.label ?? `Gallery item ${index + 1}`),
        accent: readString(item.accent, fallback[index]?.accent ?? `ITEM ${index + 1}`),
        panel_class_name: readString(
          item.panel_class_name,
          fallback[index]?.panel_class_name ?? fallback[0].panel_class_name
        ),
        orb_class_name: readString(
          item.orb_class_name,
          fallback[index]?.orb_class_name ?? fallback[0].orb_class_name
        ),
      };
    })
    .filter((item): item is ProductGalleryItem => item !== null);

  return items.length >= 4 ? items : fallback;
}

function buildDefaultOptionGroups(product: ProductSeedShape): ProductOptionGroup[] {
  const category = `${product.category_label} ${product.name}`.toLowerCase();

  if (category.includes("shoe") || category.includes("runner") || category.includes("sneaker")) {
    return [
      {
        id: "size",
        label: "Size",
        values: ["8", "9", "10", "11"],
        selected_value: "9",
        helper_text: "Selected size",
      },
    ];
  }

  return [
    {
      id: "option",
      label: "Option",
      values: ["Core", "Plus", "Premium", "Signature"],
      selected_value: "Plus",
      helper_text: "Selected option",
    },
  ];
}

function normalizeOptionGroups(
  value: unknown,
  fallback: ProductOptionGroup[]
): ProductOptionGroup[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const groups = value
    .map((item, index): ProductOptionGroup | null => {
      if (!isRecord(item)) {
        return null;
      }

      const fallbackGroup = fallback[index] ?? fallback[0];
      const values = readStringArray(item.values, fallbackGroup.values);
      const selectedValue = readString(item.selected_value, values[0]);

      return {
        id: readString(item.id, fallbackGroup.id),
        label: readString(item.label, fallbackGroup.label),
        values,
        selected_value: values.includes(selectedValue) ? selectedValue : values[0],
        helper_text:
          typeof item.helper_text === "string" && item.helper_text.trim()
            ? item.helper_text.trim()
            : fallbackGroup.helper_text,
      };
    })
    .filter((item): item is ProductOptionGroup => item !== null);

  return groups.length > 0 ? groups : fallback;
}

function buildDefaultQuantitySelector(): ProductQuantitySelector {
  return {
    label: "Quantity",
    helper_text: "Max 10",
    min: 1,
    max: 10,
  };
}

function normalizeQuantitySelector(value: unknown): ProductQuantitySelector {
  const fallback = buildDefaultQuantitySelector();

  if (!isRecord(value)) {
    return fallback;
  }

  const min = Math.max(1, Math.floor(readNumber(value.min, fallback.min)));
  const max = Math.max(min, Math.floor(readNumber(value.max, fallback.max)));

  return {
    label: readString(value.label, fallback.label),
    helper_text: readString(value.helper_text, fallback.helper_text),
    min,
    max,
  };
}

function normalizeTrustItems(value: unknown): ProductTrustItem[] {
  const fallback: ProductTrustItem[] = [
    { title: "Fast shipping" },
    { title: "Easy returns" },
    { title: "Secure checkout" },
  ];

  if (!Array.isArray(value)) {
    return fallback;
  }

  const items = value
    .map((item, index): ProductTrustItem | null => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        title: readString(item.title, fallback[index]?.title ?? `Trust signal ${index + 1}`),
        detail:
          typeof item.detail === "string" && item.detail.trim() ? item.detail.trim() : undefined,
      };
    })
    .filter((item): item is ProductTrustItem => item !== null);

  return items.length > 0 ? items : fallback;
}

function buildDefaultReviews(product: ProductSeedShape): ProductReview[] {
  return [
    {
      name: "Alex M.",
      rating_label: "★★★★★",
      body: `${product.name} feels polished, easy to trust, and worth the price.`,
    },
    {
      name: "Jordan R.",
      rating_label: "★★★★☆",
      body: `The setup is simple and the core benefits of ${product.name} are immediately clear.`,
    },
    {
      name: "Taylor S.",
      rating_label: "★★★★★",
      body: `Strong first impression, clean presentation, and a purchase flow that feels frictionless.`,
    },
  ];
}

function normalizeReviews(value: unknown, fallback: ProductReview[]): ProductReview[] {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const reviews = value
    .map((item, index): ProductReview | null => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        name: readString(item.name, fallback[index]?.name ?? `Reviewer ${index + 1}`),
        rating_label: readString(
          item.rating_label,
          fallback[index]?.rating_label ?? "★★★★★"
        ),
        body: readString(item.body, fallback[index]?.body ?? "Useful customer feedback."),
      };
    })
    .filter((item): item is ProductReview => item !== null);

  return reviews.length > 0 ? reviews : fallback;
}

function buildDefaultRecommendations(): ProductRecommendation[] {
  return [
    {
      name: "Extended Care Kit",
      description: "A practical add-on that supports setup, protection, and maintenance.",
      price_cents: 2400,
      panel_class_name: "from-orange-100 via-amber-50 to-white",
    },
    {
      name: "Everyday Carry Case",
      description: "A lightweight companion accessory for storage or day-to-day use.",
      price_cents: 3200,
      panel_class_name: "from-sky-100 via-cyan-50 to-white",
    },
  ];
}

function normalizeRecommendations(value: unknown): ProductRecommendation[] {
  const fallback = buildDefaultRecommendations();

  if (!Array.isArray(value)) {
    return fallback;
  }

  const recommendations = value
    .map((item, index): ProductRecommendation | null => {
      if (!isRecord(item)) {
        return null;
      }

      return {
        name: readString(item.name, fallback[index]?.name ?? `Recommendation ${index + 1}`),
        description: readString(
          item.description,
          fallback[index]?.description ?? "Helpful companion item."
        ),
        price_cents: Math.max(0, Math.floor(readNumber(item.price_cents, 0))),
        panel_class_name: readString(
          item.panel_class_name,
          fallback[index]?.panel_class_name ?? fallback[0].panel_class_name
        ),
      };
    })
    .filter((item): item is ProductRecommendation => item !== null);

  return recommendations.length > 0 ? recommendations : fallback;
}

export function formatPrice(priceCents: number): string {
  return `$${(priceCents / 100).toFixed(2)}`;
}

export function buildDefaultStorefrontContent(
  product: ProductSeedShape
): ProductStorefrontContent {
  const defaultOptions = buildDefaultOptionGroups(product);
  const defaultReviews = buildDefaultReviews(product);

  return {
    template_key: "standard_pdp",
    hero_kicker: product.category_label,
    primary_cta_label: `Add ${product.name} to cart`,
    sticky_cta_label: "Jump to purchase",
    gallery_items: buildDefaultGalleryItems(),
    option_groups: defaultOptions,
    quantity_selector: buildDefaultQuantitySelector(),
    trust_items: [
      { title: `Free shipping on ${product.name}` },
      { title: "30-day returns" },
      { title: "Secure checkout" },
    ],
    reviews_heading: "Customer reviews",
    reviews_subheading: `Feedback from shoppers using ${product.name}.`,
    reviews: defaultReviews,
    recommendations_heading: "Recommended add-ons",
    recommendations_subheading: `Common extras paired with ${product.name}.`,
    recommendations: buildDefaultRecommendations(),
  };
}

export function normalizeStorefrontContent(
  product: ProductSeedShape
): ProductStorefrontContent {
  const fallback = buildDefaultStorefrontContent(product);
  const rawStorefront = isRecord(product.storefront) ? product.storefront : {};
  const optionGroups = normalizeOptionGroups(rawStorefront.option_groups, fallback.option_groups);

  return {
    template_key: readString(rawStorefront.template_key, fallback.template_key),
    hero_kicker: readString(rawStorefront.hero_kicker, fallback.hero_kicker),
    primary_cta_label: readString(rawStorefront.primary_cta_label, fallback.primary_cta_label),
    sticky_cta_label:
      typeof rawStorefront.sticky_cta_label === "string" &&
      rawStorefront.sticky_cta_label.trim()
        ? rawStorefront.sticky_cta_label.trim()
        : fallback.sticky_cta_label,
    gallery_items: normalizeGalleryItems(rawStorefront.gallery_items),
    option_groups: optionGroups,
    quantity_selector: normalizeQuantitySelector(rawStorefront.quantity_selector),
    trust_items: normalizeTrustItems(rawStorefront.trust_items),
    reviews_heading: readString(rawStorefront.reviews_heading, fallback.reviews_heading),
    reviews_subheading: readString(
      rawStorefront.reviews_subheading,
      fallback.reviews_subheading
    ),
    reviews: normalizeReviews(rawStorefront.reviews, fallback.reviews),
    recommendations_heading: readString(
      rawStorefront.recommendations_heading,
      fallback.recommendations_heading
    ),
    recommendations_subheading: readString(
      rawStorefront.recommendations_subheading,
      fallback.recommendations_subheading
    ),
    recommendations: normalizeRecommendations(rawStorefront.recommendations),
  };
}

export function createSeedStorefrontContent(
  product: Pick<Product, "brand" | "category_label" | "name" | "description" | "price_cents">,
  storefront?: Partial<ProductStorefrontContent>
): ProductStorefrontContent {
  const base = buildDefaultStorefrontContent(product);

  return normalizeStorefrontContent({
    ...product,
    storefront: {
      ...base,
      ...storefront,
      option_groups: storefront?.option_groups ?? base.option_groups,
      quantity_selector: storefront?.quantity_selector ?? base.quantity_selector,
      gallery_items: storefront?.gallery_items ?? base.gallery_items,
      trust_items: storefront?.trust_items ?? base.trust_items,
      reviews: storefront?.reviews ?? base.reviews,
      recommendations: storefront?.recommendations ?? base.recommendations,
    },
  });
}

export function getDefaultOptionSelection(optionGroups: ProductOptionGroup[]): Record<string, string> {
  return optionGroups.reduce<Record<string, string>>((selection, group) => {
    selection[group.id] = group.selected_value;
    return selection;
  }, {});
}

export function getPrimaryOptionGroup(optionGroups: ProductOptionGroup[]): ProductOptionGroup {
  return optionGroups[0] ?? {
    id: slugifyValue("option", "option"),
    label: "Option",
    values: ["Default"],
    selected_value: "Default",
    helper_text: "Selected option",
  };
}
