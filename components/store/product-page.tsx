"use client";

import { useEffect, useRef, useState } from "react";
import { HeroSection } from "@/components/store/sections/HeroSection";
import { ImagesSection } from "@/components/store/sections/ImagesSection";
import { PurchaseSection } from "@/components/store/sections/PurchaseSection";
import { RecommendationsSection } from "@/components/store/sections/RecommendationsSection";
import { SocialProofSection } from "@/components/store/sections/SocialProofSection";
import { TrustSection } from "@/components/store/sections/TrustSection";
import { VariantZone } from "@/components/store/variant-zone";
import type { PageSection, Product, Variant, VariantType } from "@/lib/types";

interface StoreProductClientPageProps {
  product: Product;
  experimentId?: string;
  visitorId: string;
  assignedVariant: VariantType;
  variant: Variant;
}

function getVariantHtml(
  targetRegion: PageSection,
  variant: Variant
): string | undefined {
  return variant.target_region === targetRegion ? variant.html : undefined;
}

/**
 * Renders the public storefront and swaps in the generated region for the assigned variant.
 *
 * @param props - Experiment and visitor identifiers plus the resolved variant payload.
 * @returns The interactive product page.
 */
export function StoreProductClientPage({
  product,
  experimentId,
  visitorId,
  assignedVariant,
  variant,
}: StoreProductClientPageProps): JSX.Element {
  const aboveFoldRef = useRef<HTMLDivElement | null>(null);
  const [showStickyBar, setShowStickyBar] = useState<boolean>(false);

  useEffect(() => {
    function handleScroll(): void {
      const bounds = aboveFoldRef.current?.getBoundingClientRect();

      if (!bounds) {
        return;
      }

      setShowStickyBar(bounds.bottom < 80);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const isLayoutVariant = variant.target_region === "layout";
  const resolvedExperimentId = experimentId ?? "";

  return (
    <main className="min-h-screen bg-white px-3 py-4 text-[#111827] sm:px-4 sm:py-6 lg:px-6 lg:py-8">
      <div className="mx-auto max-w-[88rem] overflow-hidden rounded-[1.5rem] border border-[#e5e7eb] bg-white shadow-[0_18px_50px_rgba(17,24,39,0.08)] sm:rounded-[2rem]">
        <header className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-4 py-4 sm:px-6 lg:px-8 lg:py-5">
          <div>
            <p className="text-xl font-semibold text-[#111827] sm:text-2xl">{product.brand}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[#6b7280] sm:text-xs sm:tracking-[0.22em]">
              {product.category_label}
            </p>
          </div>
          <div className="rounded-full border border-[#e5e7eb] bg-[#f7f8fa] px-3 py-2 text-xs text-[#4b5563] sm:px-4 sm:text-sm">
            Cart
          </div>
        </header>

        <div ref={aboveFoldRef}>
          {isLayoutVariant ? (
            <div className="bg-white p-4 sm:p-6 lg:p-8">
              <VariantZone
                experimentId={resolvedExperimentId}
                html={variant.html}
                product={product}
                variantType={assignedVariant}
                visitorId={visitorId}
                title={`${assignedVariant} layout region`}
                minHeight={600}
              />
            </div>
          ) : (
            <div className="grid gap-5 bg-white p-4 md:gap-6 md:p-6 xl:grid-cols-[1fr_0.92fr] xl:gap-8 xl:p-8">
              <ImagesSection
                variantHtml={getVariantHtml("images", variant)}
                experimentId={resolvedExperimentId}
                variantType={assignedVariant}
                visitorId={visitorId}
                product={product}
              />

              <section className="rounded-3xl border border-[#e5e7eb] bg-[#f7f8fa] p-5 sm:p-6 lg:p-7">
                <HeroSection
                  variantHtml={getVariantHtml("hero", variant)}
                  experimentId={resolvedExperimentId}
                  variantType={assignedVariant}
                  visitorId={visitorId}
                  product={product}
                />
                <div id="purchase-section">
                  <PurchaseSection
                    variantHtml={getVariantHtml("purchase", variant)}
                    experimentId={resolvedExperimentId}
                    variantType={assignedVariant}
                    visitorId={visitorId}
                    product={product}
                  />
                </div>
                <div className="mt-6">
                  <TrustSection
                    variantHtml={getVariantHtml("trust", variant)}
                    experimentId={resolvedExperimentId}
                    variantType={assignedVariant}
                    visitorId={visitorId}
                    product={product}
                  />
                </div>
              </section>
            </div>
          )}
        </div>

        <SocialProofSection
          variantHtml={getVariantHtml("social_proof", variant)}
          experimentId={resolvedExperimentId}
          variantType={assignedVariant}
          visitorId={visitorId}
          product={product}
        />
        <RecommendationsSection
          variantHtml={getVariantHtml("recommendations", variant)}
          experimentId={resolvedExperimentId}
          variantType={assignedVariant}
          visitorId={visitorId}
          product={product}
        />
      </div>

        <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#e5e7eb] bg-white/95 backdrop-blur transition ${
          showStickyBar ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-[88rem] items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
          <div>
            <p className="text-sm font-semibold text-[#111827] sm:text-base">{product.name}</p>
            <p className="text-xs text-[#007600] sm:text-sm">
              ${(product.price_cents / 100).toFixed(2)}
            </p>
          </div>
          <a
            href="#purchase-section"
            className="rounded-full bg-[#111827] px-4 py-2.5 text-xs font-semibold text-white transition hover:opacity-90 sm:px-6 sm:py-3 sm:text-sm"
          >
            {product.storefront.sticky_cta_label ?? product.storefront.primary_cta_label}
          </a>
        </div>
      </div>
    </main>
  );
}
