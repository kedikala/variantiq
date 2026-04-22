import type { Product, VariantType } from "@/lib/types";

export interface StoreSectionVariantProps {
  variantHtml?: string;
  experimentId: string;
  variantType: VariantType;
  visitorId: string;
  product: Product;
}
