import { VariantZone } from "@/components/store/variant-zone";
import type { StoreSectionVariantProps } from "./types";

/**
 * Renders the hero section or a section-targeted Codex replacement.
 *
 * @param props - Optional variant HTML plus tracking identifiers.
 * @returns The hero section content.
 */
export function HeroSection({
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
        title={`${variantType} hero section`}
        minHeight={240}
      />
    );
  }

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[#6b7280] sm:text-xs sm:tracking-[0.28em]">
        {product.storefront.hero_kicker}
      </p>
      <h1 className="mt-3 text-3xl font-semibold leading-[1.12] text-[#111827] sm:mt-4 sm:text-4xl lg:text-[3.25rem]">
        {product.name}
      </h1>
      <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
        <p className="text-xs tracking-[0.14em] text-[#f5a623] sm:text-sm sm:tracking-[0.18em]">★★★★½</p>
        <p className="text-xs text-[#6b7280] sm:text-sm">{product.review_count} reviews</p>
      </div>
      <p className="mt-4 text-3xl font-bold tracking-tight text-[#007600] sm:text-4xl lg:text-5xl">
        ${(product.price_cents / 100).toFixed(2)}
      </p>
      <p className="mt-3 max-w-xl text-sm leading-6 text-[#4b5563] sm:text-base sm:leading-7">
        {product.description}
      </p>
    </div>
  );
}
