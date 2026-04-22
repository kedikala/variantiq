import "server-only";

import { normalizeStorefrontContent } from "@/lib/storefront";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";
import type { Database, Product } from "@/lib/types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

function normalizeProduct(product: ProductRow): Product {
  return {
    ...product,
    storefront: normalizeStorefrontContent(product),
  };
}

/**
 * Returns all active products ordered by name for merchant selection.
 *
 * @returns Active storefront products.
 * @throws {Error} If the query fails.
 */
export async function getProducts(): Promise<Product[]> {
  const supabase = createSupabaseAdminClient();
  const { data: products, error } = await supabase
    .from("products")
    .select()
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to load products: ${error.message}`);
  }

  return products.map(normalizeProduct);
}

/**
 * Returns an active storefront product by slug.
 *
 * @param slug - Canonical product slug.
 * @returns The matching product or null when not found.
 * @throws {Error} If the query fails.
 */
export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = createSupabaseAdminClient();
  const { data: product, error } = await supabase
    .from("products")
    .select()
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load product: ${error.message}`);
  }

  return product ? normalizeProduct(product) : null;
}

/**
 * Returns a product by primary key.
 *
 * @param productId - Product identifier.
 * @returns The matching product.
 * @throws {Error} If the query fails.
 */
export async function getProduct(productId: string): Promise<Product> {
  const supabase = createSupabaseAdminClient();
  const { data: product, error } = await supabase.from("products").select().eq("id", productId).single();

  if (error) {
    throw new Error(`Failed to load product: ${error.message}`);
  }

  return normalizeProduct(product);
}
