import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";
import { StoreProductClientPage } from "@/components/store/product-page";
import { getPreviewExperimentBundle, getPublicProductExperimentBundle } from "@/lib/experiments";
import { getProductBySlug } from "@/lib/products";
import { logVisit } from "@/lib/tracking";
import type { Variant, VariantType } from "@/lib/types";

interface ProductPageProps {
  params: {
    slug: string;
  };
  searchParams: {
    preview?: string;
    experimentId?: string;
  };
}

function parsePreviewVariant(value?: string): VariantType | null {
  return value === "control" || value === "treatment" ? value : null;
}

function createBaseVariant(): Variant {
  return {
    id: "base-storefront",
    experiment_id: "",
    type: "control",
    target_region: "purchase",
    html: "",
    rationale: "",
    created_at: new Date(0).toISOString(),
  };
}

/**
 * Renders the public product page using the active experiment for a canonical product slug.
 *
 * @param props - Dynamic product slug and optional preview query.
 * @returns The public storefront page.
 */
export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps): Promise<JSX.Element> {
  const product = await getProductBySlug(params.slug);

  if (!product) {
    notFound();
  }

  const previewVariant = parsePreviewVariant(searchParams.preview);
  const previewExperimentId = searchParams.experimentId;
  const cookieStore = cookies();
  const headerStore = headers();
  const visitorId =
    headerStore.get("x-visitor-id") ??
    cookieStore.get("visitor_id")?.value ??
    crypto.randomUUID();
  const assignedVariant =
    previewVariant ??
    ((headerStore.get("x-assigned-variant") as VariantType | null) ??
      (cookieStore.get(`variant_${product.slug}`)?.value as VariantType | undefined) ??
      "control");
  const bundle =
    previewVariant && previewExperimentId
      ? await getPreviewExperimentBundle(previewExperimentId, product.id)
      : await getPublicProductExperimentBundle(product.id);

  if (bundle && !previewVariant) {
    await logVisit(bundle.experiment.id, assignedVariant, visitorId);
  }

  return (
    <StoreProductClientPage
      product={product}
      experimentId={bundle?.experiment.id}
      visitorId={visitorId}
      assignedVariant={assignedVariant}
      variant={bundle ? bundle[assignedVariant] : createBaseVariant()}
    />
  );
}
