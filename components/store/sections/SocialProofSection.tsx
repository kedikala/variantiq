import { VariantZone } from "@/components/store/variant-zone";
import type { StoreSectionVariantProps } from "./types";

/**
 * Renders the reviews section or a section-targeted Codex replacement.
 *
 * @param props - Optional variant HTML plus tracking identifiers.
 * @returns The social proof section content.
 */
export function SocialProofSection({
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
        title={`${variantType} social proof section`}
        minHeight={360}
      />
    );
  }

  return (
    <section className="border-t border-[#e5e7eb] bg-white px-8 py-8">
      <div>
        <p className="pb-2 text-3xl font-semibold leading-[1.18] text-[#111827]">
          {product.storefront.reviews_heading}
        </p>
        <p className="mt-2 text-sm text-[#6b7280]">
          {product.storefront.reviews_subheading}
        </p>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {product.storefront.reviews.map((review) => (
          <article
            key={review.name}
            className="rounded-3xl border border-[#e5e7eb] bg-white p-5 shadow-[0_10px_25px_rgba(17,24,39,0.04)]"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-[#111827]">{review.name}</p>
              <p className="text-sm tracking-[0.18em] text-[#f5a623]">{review.rating_label}</p>
            </div>
            <p className="mt-4 text-sm leading-7 text-[#4b5563]">{review.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
