import { VariantZone } from "@/components/store/variant-zone";
import { formatPrice } from "@/lib/storefront";
import type { StoreSectionVariantProps } from "./types";

/**
 * Renders the recommendations section or a section-targeted Codex replacement.
 *
 * @param props - Optional variant HTML plus tracking identifiers.
 * @returns The recommendations section content.
 */
export function RecommendationsSection({
  variantHtml,
  experimentId,
  variantType,
  visitorId,
  product,
}: StoreSectionVariantProps): JSX.Element {
  if (variantHtml) {
    return (
      <VariantZone
        experimentId={experimentId}
        html={variantHtml}
        product={product}
        variantType={variantType}
        visitorId={visitorId}
        title={`${variantType} recommendations section`}
        minHeight={320}
      />
    );
  }

  return (
    <section className="border-t border-[#e5e7eb] bg-[#f7f8fa] px-8 py-8">
      <div>
        <p className="pb-2 text-3xl font-semibold leading-[1.18] text-[#111827]">
          {product.storefront.recommendations_heading}
        </p>
        <p className="mt-2 text-sm text-[#6b7280]">
          {product.storefront.recommendations_subheading}
        </p>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {product.storefront.recommendations.map((recommendation) => (
          <article
            key={recommendation.name}
            className="rounded-3xl border border-[#e5e7eb] bg-white p-5"
          >
            <div className="flex items-center gap-4">
              <div
                className={`h-20 w-20 rounded-2xl bg-gradient-to-br ${recommendation.panel_class_name}`}
              />
              <div>
                <p className="font-semibold text-[#111827]">{recommendation.name}</p>
                <p className="mt-1 text-sm text-[#6b7280]">{recommendation.description}</p>
                <p className="mt-3 text-lg font-bold text-[#111827]">
                  {formatPrice(recommendation.price_cents)}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
