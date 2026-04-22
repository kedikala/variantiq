"use client";

import { useMemo, useState } from "react";
import { VariantZone } from "@/components/store/variant-zone";
import type { StoreSectionVariantProps } from "./types";

/**
 * Renders the image gallery section or a section-targeted Codex replacement.
 *
 * @param props - Optional variant HTML plus tracking identifiers.
 * @returns The image section content.
 */
export function ImagesSection({
  variantHtml,
  experimentId,
  variantType,
  visitorId,
  product,
}: StoreSectionVariantProps): JSX.Element {
  const galleryItems = product.storefront.gallery_items;
  const [selectedImageId, setSelectedImageId] = useState<string>(galleryItems[0].id);
  const selectedImage = useMemo(
    () => galleryItems.find((image) => image.id === selectedImageId) ?? galleryItems[0],
    [galleryItems, selectedImageId]
  );

  if (variantHtml) {
    return (
      <VariantZone
        experimentId={experimentId}
        html={variantHtml}
        product={product}
        variantType={variantType}
        visitorId={visitorId}
        title={`${variantType} images section`}
        minHeight={520}
      />
    );
  }

  return (
    <section className="space-y-3 rounded-3xl border border-[#e5e7eb] bg-[#f7f8fa] p-4 sm:space-y-4 sm:p-5 lg:p-6">
        <div
          className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-3xl border border-[#e5e7eb] bg-gradient-to-br ${selectedImage.panel_class_name}`}
        >
        <div
          className={`absolute inset-x-[18%] top-[14%] h-[58%] rounded-[42%] bg-gradient-to-br opacity-90 blur-[1px] ${selectedImage.orb_class_name}`}
        />
        <div className="absolute inset-x-[20%] bottom-[15%] h-[11%] rounded-full bg-black/10 blur-2xl" />
        <div className="relative z-10 flex h-full w-full items-center justify-center px-6 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
          <div className="relative flex w-full max-w-[28rem] items-center justify-center rounded-[2rem] border border-white/70 bg-white/65 px-8 py-12 shadow-[0_24px_32px_rgba(17,24,39,0.12)] backdrop-blur">
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6b7280] sm:text-xs">
                {selectedImage.accent}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-[#111827] sm:text-3xl">
                {product.name}
              </p>
              <p className="mt-3 text-sm text-[#4b5563] sm:text-base">
                {selectedImage.label}
              </p>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-white/92 via-white/52 to-transparent px-5 pb-5 pt-10 sm:px-6 sm:pb-6">
          <p className="text-center text-lg font-semibold leading-[1.15] text-[#111827] sm:text-xl lg:text-2xl">
            {product.name}
          </p>
          <p className="mt-2 text-center text-[10px] uppercase tracking-[0.18em] text-[#6b7280] sm:text-xs sm:tracking-[0.22em]">
            {selectedImage.label}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {galleryItems.map((image) => {
          const isSelected = image.id === selectedImageId;

          return (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedImageId(image.id)}
              className={`overflow-hidden rounded-2xl border bg-white p-1 text-left transition ${
                isSelected
                  ? "border-[#111827] shadow-[0_10px_20px_rgba(17,24,39,0.12)]"
                  : "border-[#e5e7eb] hover:border-[#9ca3af]"
              }`}
            >
              <div
                className={`h-14 rounded-[0.9rem] bg-gradient-to-br sm:h-16 lg:h-20 ${image.panel_class_name}`}
              />
              <p className="px-1.5 pb-2 pt-2 text-[10px] font-medium uppercase tracking-[0.14em] text-[#4b5563] sm:px-2 sm:pt-3 sm:text-xs sm:tracking-[0.18em]">
                {image.accent}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
