"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Product, VariantType } from "@/lib/types";

interface VariantZoneProps {
  experimentId: string;
  html: string;
  product: Product;
  variantType: VariantType;
  visitorId: string;
  title?: string;
  onHeightChange?: (height: number) => void;
  minHeight?: number;
}

interface TrackingApiError {
  error: string;
  code: string;
}

function wrapForIframe(html: string, disabled: boolean, product: Product): string {
  const optionGroups = product.storefront.option_groups.map((group) => ({
    id: group.id,
    selectedValue: group.selected_value,
    values: group.values,
  }));
  const galleryItems = product.storefront.gallery_items.map((item) => ({
    id: item.id,
    label: item.label,
    panelClasses: item.panel_class_name.split(/\s+/).filter(Boolean),
    orbClasses: item.orb_class_name.split(/\s+/).filter(Boolean),
  }));
  const quantityConfig = product.storefront.quantity_selector;
  const config = JSON.stringify({
    optionGroups,
    galleryItems,
    quantity: {
      min: quantityConfig.min,
      max: quantityConfig.max,
    },
  });

  return `<!DOCTYPE html><html><head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <script src="https://cdn.tailwindcss.com"></script>
      <style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}body{font-size:15px;-webkit-text-size-adjust:100%;text-size-adjust:100%}*{box-sizing:border-box}</style>
    </head><body>${html}
    <script>
      const addedState = ${disabled ? "true" : "false"};
      const config = ${config};
      const findPrimaryCta = () => document.querySelector('[data-primary-cta="true"]');
      const SIZE_SELECTED_CLASSES = ['border-[#111827]', 'bg-[#111827]', 'text-white'];
      const SIZE_UNSELECTED_CLASSES = ['border-[#e5e7eb]', 'bg-white', 'text-[#111827]'];
      const THUMB_SELECTED_CLASSES = ['border-[#111827]', 'shadow-[0_10px_20px_rgba(17,24,39,0.12)]'];
      const THUMB_UNSELECTED_CLASSES = ['border-[#e5e7eb]'];
      const GALLERY_LABELS = Object.fromEntries(config.galleryItems.map((item) => [item.id, item.label]));
      const GALLERY_PANEL_CLASSES = Object.fromEntries(config.galleryItems.map((item) => [item.id, item.panelClasses]));
      const GALLERY_ORB_CLASSES = Object.fromEntries(config.galleryItems.map((item) => [item.id, item.orbClasses]));
      const updateSelectionClasses = (elements, selectedElement, selectedClasses, unselectedClasses) => {
        elements.forEach((element) => {
          const isSelected = element === selectedElement;
          element.setAttribute('data-selected', isSelected ? 'true' : 'false');
          element.classList.remove(...selectedClasses, ...unselectedClasses);
          element.classList.add(...(isSelected ? selectedClasses : unselectedClasses));
        });
      };
      const initializePurchaseState = () => {
        config.optionGroups.forEach((group) => {
          const selector = '[data-option-group="' + group.id + '"]';
          const options = Array.from(document.querySelectorAll(selector));
          const selectedLabel = document.querySelector('[data-selected-option="' + group.id + '"]');
          if (options.length === 0) {
            return;
          }
          const selectedOption =
            options.find((option) => option.getAttribute('data-selected') === 'true') ||
            options.find((option) => option.getAttribute('data-option-value') === group.selectedValue) ||
            options[0];
          if (selectedLabel && selectedOption) {
            selectedLabel.textContent =
              selectedOption.getAttribute('data-option-value') || selectedOption.textContent || '';
          }
          updateSelectionClasses(options, selectedOption, SIZE_SELECTED_CLASSES, SIZE_UNSELECTED_CLASSES);
        });
        const legacySizeOptions = Array.from(document.querySelectorAll('[data-size-option]'));
        const legacySelectedLabel = document.querySelector('[data-selected-size]');
        if (legacySizeOptions.length > 0) {
          const selectedOption =
            legacySizeOptions.find((option) => option.getAttribute('data-selected') === 'true') ||
            legacySizeOptions[0];
          if (legacySelectedLabel && selectedOption) {
            legacySelectedLabel.textContent =
              selectedOption.getAttribute('data-size-option') || selectedOption.textContent || '';
          }
          updateSelectionClasses(
            legacySizeOptions,
            selectedOption,
            SIZE_SELECTED_CLASSES,
            SIZE_UNSELECTED_CLASSES
          );
        }
        const quantityValue = document.querySelector('[data-quantity-value]');
        if (quantityValue) {
          const currentValue = Number.parseInt(quantityValue.textContent || String(config.quantity.min), 10);
          const safeValue = Number.isNaN(currentValue)
            ? config.quantity.min
            : Math.min(config.quantity.max, Math.max(config.quantity.min, currentValue));
          quantityValue.textContent = String(safeValue);
        }
      };
      const initializeGalleryState = () => {
        const galleryOptions = Array.from(document.querySelectorAll('[data-gallery-option]'));
        const selectedGallery = galleryOptions.find((option) => option.getAttribute('data-selected') === 'true') || galleryOptions[0];
        const galleryLabel = document.querySelector('[data-gallery-label]');
        const galleryPanel = document.querySelector('[data-gallery-panel]');
        const galleryOrb = document.querySelector('[data-gallery-orb]');
        if (galleryLabel && selectedGallery) {
          const nextColorway = selectedGallery.getAttribute('data-gallery-option') || selectedGallery.textContent || '';
          galleryLabel.textContent = GALLERY_LABELS[nextColorway] || nextColorway;
        }
        if (galleryPanel && selectedGallery) {
          const nextColorway = selectedGallery.getAttribute('data-gallery-option') || '';
          const nextClasses = GALLERY_PANEL_CLASSES[nextColorway] || [];
          Object.values(GALLERY_PANEL_CLASSES).flat().forEach((className) => galleryPanel.classList.remove(className));
          galleryPanel.classList.add(...nextClasses);
        }
        if (galleryOrb && selectedGallery) {
          const nextColorway = selectedGallery.getAttribute('data-gallery-option') || '';
          const nextClasses = GALLERY_ORB_CLASSES[nextColorway] || [];
          Object.values(GALLERY_ORB_CLASSES).flat().forEach((className) => galleryOrb.classList.remove(className));
          galleryOrb.classList.add(...nextClasses);
        }
        updateSelectionClasses(galleryOptions, selectedGallery, THUMB_SELECTED_CLASSES, THUMB_UNSELECTED_CLASSES);
      };
      const postHeight = () => {
        const root = document.documentElement;
        const body = document.body;
        const height = Math.ceil(Math.max(
          root.scrollHeight || 0,
          root.offsetHeight || 0,
          root.clientHeight || 0,
          body.scrollHeight || 0,
          body.offsetHeight || 0,
          body.clientHeight || 0
        ));
        window.parent.postMessage({ type: 'variant-height', height }, '*');
      };
      const scheduleHeightChecks = () => {
        postHeight();
        requestAnimationFrame(postHeight);
        window.setTimeout(postHeight, 50);
        window.setTimeout(postHeight, 150);
        window.setTimeout(postHeight, 300);
        window.setTimeout(postHeight, 600);
      };
      const applyAddedState = () => {
        if (!addedState) return;
        const cta = findPrimaryCta();
        if (!cta) return;
        cta.textContent = 'Added to cart! ✓';
        cta.setAttribute('aria-disabled', 'true');
        cta.setAttribute('data-added-state', 'true');
        cta.classList.add('opacity-70', 'cursor-not-allowed');
        if ('disabled' in cta) {
          cta.disabled = true;
        }
      };
      const updateSelectedOption = (button) => {
        const groupId = button.getAttribute('data-option-group');
        if (groupId) {
          const options = Array.from(document.querySelectorAll('[data-option-group="' + groupId + '"]'));
          const selectedLabel = document.querySelector('[data-selected-option="' + groupId + '"]');
          updateSelectionClasses(options, button, SIZE_SELECTED_CLASSES, SIZE_UNSELECTED_CLASSES);
          if (selectedLabel) {
            selectedLabel.textContent =
              button.getAttribute('data-option-value') || button.textContent || '';
          }
          scheduleHeightChecks();
          return;
        }
        if (button.hasAttribute('data-size-option')) {
          const options = Array.from(document.querySelectorAll('[data-size-option]'));
          const selectedLabel = document.querySelector('[data-selected-size]');
          updateSelectionClasses(options, button, SIZE_SELECTED_CLASSES, SIZE_UNSELECTED_CLASSES);
          if (selectedLabel) {
            selectedLabel.textContent =
              button.getAttribute('data-size-option') || button.textContent || '';
          }
        }
        scheduleHeightChecks();
      };
      const updateQuantity = (action) => {
        const quantityValue = document.querySelector('[data-quantity-value]');
        if (!quantityValue) return;
        const currentValue = Number.parseInt(quantityValue.textContent || '1', 10);
        const safeCurrent = Number.isNaN(currentValue) ? config.quantity.min : currentValue;
        const delta = action === 'decrease' ? -1 : 1;
        const nextValue = Math.min(config.quantity.max, Math.max(config.quantity.min, safeCurrent + delta));
        quantityValue.textContent = String(nextValue);
        scheduleHeightChecks();
      };
      const updateGallerySelection = (button) => {
        const galleryOptions = Array.from(document.querySelectorAll('[data-gallery-option]'));
        const galleryLabel = document.querySelector('[data-gallery-label]');
        const galleryPanel = document.querySelector('[data-gallery-panel]');
        const galleryOrb = document.querySelector('[data-gallery-orb]');
        const nextColorway = button.getAttribute('data-gallery-option') || button.textContent || '';
        updateSelectionClasses(galleryOptions, button, THUMB_SELECTED_CLASSES, THUMB_UNSELECTED_CLASSES);
        if (galleryLabel) {
          galleryLabel.textContent = GALLERY_LABELS[nextColorway] || nextColorway;
        }
        if (galleryPanel) {
          Object.values(GALLERY_PANEL_CLASSES).flat().forEach((className) => galleryPanel.classList.remove(className));
          const nextClasses = GALLERY_PANEL_CLASSES[nextColorway] || [];
          galleryPanel.classList.add(...nextClasses);
        }
        if (galleryOrb) {
          Object.values(GALLERY_ORB_CLASSES).flat().forEach((className) => galleryOrb.classList.remove(className));
          const nextClasses = GALLERY_ORB_CLASSES[nextColorway] || [];
          galleryOrb.classList.add(...nextClasses);
        }
        scheduleHeightChecks();
      };
      const emitClick = (event) => {
        if (!(event.target instanceof Element)) return;
        const optionButton = event.target.closest('[data-option-group]');
        if (optionButton) {
          event.preventDefault();
          updateSelectedOption(optionButton);
          return;
        }
        const legacySizeButton = event.target.closest('[data-size-option]');
        if (legacySizeButton) {
          event.preventDefault();
          updateSelectedOption(legacySizeButton);
          return;
        }
        const quantityButton = event.target.closest('[data-quantity-action]');
        if (quantityButton) {
          event.preventDefault();
          updateQuantity(quantityButton.getAttribute('data-quantity-action') || 'increase');
          return;
        }
        const galleryButton = event.target.closest('[data-gallery-option]');
        if (galleryButton) {
          event.preventDefault();
          updateGallerySelection(galleryButton);
          return;
        }
        const target = event.target.closest('[data-primary-cta="true"]');
        if (!target) return;
        event.preventDefault();
        window.parent.postMessage({ type: 'variant-cta-click' }, '*');
      };
      const resizeObserver = new ResizeObserver(scheduleHeightChecks);
      resizeObserver.observe(document.body);
      resizeObserver.observe(document.documentElement);
      const mutationObserver = new MutationObserver(scheduleHeightChecks);
      mutationObserver.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
      window.addEventListener('load', scheduleHeightChecks);
      window.addEventListener('resize', scheduleHeightChecks);
      document.addEventListener('DOMContentLoaded', scheduleHeightChecks);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(scheduleHeightChecks).catch(() => {});
      }
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', scheduleHeightChecks);
      }
      initializePurchaseState();
      initializeGalleryState();
      applyAddedState();
      scheduleHeightChecks();
      document.addEventListener('click', emitClick);
    </script>
    </body></html>`;
}

async function postTrackingEvent(
  url: string,
  payload: { experimentId: string; variantType: VariantType; visitorId: string }
): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = (await response.json()) as TrackingApiError;

    throw new Error(errorPayload.error || "Tracking request failed.");
  }
}

/**
 * Renders a seamless region variant in a sandboxed iframe and tracks conversions.
 *
 * @param props - Variant rendering and tracking inputs.
 * @returns The client-side purchase module.
 */
export function VariantZone({
  experimentId,
  html,
  product,
  variantType,
  visitorId,
  title,
  onHeightChange,
  minHeight,
}: VariantZoneProps): JSX.Element {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [isAddedToCart, setIsAddedToCart] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const resolvedMinHeight = minHeight ?? 180;
  const [frameHeight, setFrameHeight] = useState<number>(resolvedMinHeight);
  const iframeMarkup = useMemo(
    () => wrapForIframe(html, isAddedToCart, product),
    [html, isAddedToCart, product]
  );

  useEffect(() => {
    function handleMessage(event: MessageEvent): void {
      const iframeWindow = iframeRef.current?.contentWindow;

      if (!iframeWindow || event.source !== iframeWindow) {
        return;
      }

      if (event.data?.type === "variant-height" && typeof event.data.height === "number") {
        const nextHeight = Math.max(resolvedMinHeight, event.data.height);

        setFrameHeight(nextHeight);
        onHeightChange?.(nextHeight);
        return;
      }

      if (
        (event.origin !== window.location.origin && event.origin !== "null") ||
        event.data?.type !== "variant-cta-click" ||
        isAddedToCart
      ) {
        return;
      }

      void postTrackingEvent("/api/track/conversion", {
        experimentId,
        variantType,
        visitorId,
      })
        .then(() => {
          setIsAddedToCart(true);
          setErrorMessage(null);
        })
        .catch((error) => {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to track conversion right now."
          );
        });
    }

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [experimentId, isAddedToCart, onHeightChange, resolvedMinHeight, variantType, visitorId]);

  return (
    <div>
      <iframe
        ref={iframeRef}
        title={title ?? `${variantType} purchase module`}
        sandbox="allow-scripts"
        srcDoc={iframeMarkup}
        scrolling="no"
        style={{ height: `${frameHeight}px`, minHeight: `${resolvedMinHeight}px` }}
        className="block w-full border-0 bg-transparent p-0"
      />
      {errorMessage ? <p className="text-sm text-[#b45309]">{errorMessage}</p> : null}
    </div>
  );
}
