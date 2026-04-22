import { VariantZone } from "@/components/store/variant-zone";
import type { StoreSectionVariantProps } from "./types";

/**
 * Renders the trust section or a section-targeted Codex replacement.
 *
 * @param props - Optional variant HTML plus tracking identifiers.
 * @returns The trust section content.
 */
export function TrustSection({
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
        title={`${variantType} trust section`}
        minHeight={120}
      />
    );
  }

  return (
    <div className="rounded-3xl border border-[#e5e7eb] bg-[#f3f4f6] px-5 py-4 text-sm text-[#4b5563]">
      <div className="grid gap-3 sm:grid-cols-3">
        {product.storefront.trust_items.map((item) => (
          <div key={item.title} className="rounded-2xl bg-white px-4 py-3">
            <p className="font-medium text-[#111827]">{item.title}</p>
            {item.detail ? <p className="mt-1 text-xs text-[#6b7280]">{item.detail}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
