"use client";

import { useState } from "react";
import { getDefaultOptionSelection } from "@/lib/storefront";
import { VariantZone } from "@/components/store/variant-zone";
import type { VariantType } from "@/lib/types";
import type { StoreSectionVariantProps } from "./types";

interface TrackingApiError {
  error: string;
  code: string;
}

function clampQuantity(nextQuantity: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, nextQuantity));
}

async function postConversion(
  experimentId: string,
  variantType: VariantType,
  visitorId: string
): Promise<void> {
  const response = await fetch("/api/track/conversion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ experimentId, variantType, visitorId }),
  });

  if (!response.ok) {
    const payload = (await response.json()) as TrackingApiError;

    throw new Error(payload.error || "Tracking request failed.");
  }
}

/**
 * Renders the purchase section or a section-targeted Codex replacement.
 *
 * @param props - Optional variant HTML plus tracking identifiers.
 * @returns The purchase section content.
 */
export function PurchaseSection({
  variantHtml,
  experimentId,
  variantType,
  visitorId,
  product,
}: StoreSectionVariantProps): JSX.Element {
  const optionGroups = product.storefront.option_groups;
  const quantitySelector = product.storefront.quantity_selector;
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    getDefaultOptionSelection(optionGroups)
  );
  const [quantity, setQuantity] = useState<number>(quantitySelector.min);
  const [isAddedToCart, setIsAddedToCart] = useState<boolean>(false);

  if (variantHtml) {
    return (
      <VariantZone
        experimentId={experimentId}
        html={variantHtml}
        product={product}
        variantType={variantType}
        visitorId={visitorId}
        title={`${variantType} purchase module`}
        minHeight={320}
      />
    );
  }

  return (
    <div>
      {optionGroups.map((group, index) => (
        <div key={group.id} className={index === 0 ? "mt-5 sm:mt-6" : "mt-4 sm:mt-5"}>
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[#6b7280] sm:text-sm sm:tracking-[0.18em]">
              {group.label}
            </p>
            <p className="text-xs text-[#4b5563] sm:text-sm">
              {group.helper_text ?? "Selected"}: {selectedOptions[group.id] ?? group.selected_value}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
            {group.values.map((value) => {
              const isSelected = value === selectedOptions[group.id];

              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setSelectedOptions((currentSelection) => ({
                      ...currentSelection,
                      [group.id]: value,
                    }))
                  }
                  className={`rounded-full border px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                    isSelected
                      ? "border-[#111827] bg-[#111827] text-white"
                      : "border-[#e5e7eb] bg-white text-[#111827] hover:border-[#9ca3af]"
                  }`}
                >
                  {value}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-5 sm:mt-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[#6b7280] sm:text-sm sm:tracking-[0.18em]">
            {quantitySelector.label}
          </p>
          <p className="text-xs text-[#4b5563] sm:text-sm">{quantitySelector.helper_text}</p>
        </div>
        <div className="mt-3 inline-flex items-center overflow-hidden rounded-full border border-[#e5e7eb] bg-white">
          <button
            type="button"
            onClick={() =>
              setQuantity((current) =>
                clampQuantity(current - 1, quantitySelector.min, quantitySelector.max)
              )
            }
            className="px-3 py-2.5 text-base font-semibold text-[#111827] transition hover:bg-[#f3f4f6] sm:px-4 sm:py-3 sm:text-lg"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <div className="min-w-12 border-x border-[#e5e7eb] px-3 py-2.5 text-center text-sm font-semibold text-[#111827] sm:min-w-14 sm:px-4 sm:py-3 sm:text-base">
            {quantity}
          </div>
          <button
            type="button"
            onClick={() =>
              setQuantity((current) =>
                clampQuantity(current + 1, quantitySelector.min, quantitySelector.max)
              )
            }
            className="px-3 py-2.5 text-base font-semibold text-[#111827] transition hover:bg-[#f3f4f6] sm:px-4 sm:py-3 sm:text-lg"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-5 sm:mt-6">
        <button
          type="button"
          onClick={() => {
            if (!experimentId) {
              setIsAddedToCart(true);
              return;
            }

            void postConversion(experimentId, variantType, visitorId).then(() => {
              setIsAddedToCart(true);
            });
          }}
          className="w-full rounded-full bg-[#111827] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          {isAddedToCart ? "Added to Cart" : product.storefront.primary_cta_label}
        </button>
      </div>
    </div>
  );
}
