import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Locator, Page } from "@playwright/test";
import { createSeedStorefrontContent } from "@/lib/storefront";
import type { Database } from "@/lib/types";

interface SeededExperiment {
  experimentId: string;
  productSlug: string;
}

interface SeededProduct {
  id: string;
  slug: string;
  name: string;
}

interface EnvConfig {
  baseUrl: string;
  email: string;
  password: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
}

function getEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

/**
 * Loads the environment variables required by the Playwright suites.
 *
 * @returns Normalized E2E runtime configuration.
 */
export function getE2EEnv(): EnvConfig {
  return {
    baseUrl: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    email: getEnv("PLAYWRIGHT_TEST_EMAIL"),
    password: getEnv("PLAYWRIGHT_TEST_PASSWORD"),
    supabaseUrl: getEnv("NEXT_PUBLIC_SUPABASE_URL"),
    supabaseAnonKey: getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    supabaseServiceRoleKey: getEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

function createAnonSupabaseClient(env: EnvConfig): SupabaseClient<Database> {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function createAdminSupabaseClient(env: EnvConfig): SupabaseClient<Database> {
  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function ensureProductExists(
  slug: string,
  name: string
): Promise<SeededProduct> {
  const env = getE2EEnv();
  const supabase = createAdminSupabaseClient(env);
  const storefront = createSeedStorefrontContent({
    brand: "Stridewell",
    category_label: "Stridewell Running",
    name,
    description:
      "Lightweight propulsion, race-day cushioning, and a locked-in fit built for runners who want speed without sacrificing comfort.",
    price_cents: 18900,
  });
  const { data: product, error } = await supabase
    .from("products")
    .upsert(
      {
        slug,
        brand: "Stridewell",
        category_label: "Stridewell Running",
        name,
        description:
          "Lightweight propulsion, race-day cushioning, and a locked-in fit built for runners who want speed without sacrificing comfort.",
        price_cents: 18900,
        rating: 4.5,
        review_count: 247,
        status: "active",
        storefront,
      },
      { onConflict: "slug" }
    )
    .select("id, slug, name")
    .single();

  if (error || !product) {
    throw new Error(error?.message ?? "Failed to seed product.");
  }

  return product;
}

async function cleanupProductExperiments(productId: string): Promise<void> {
  const env = getE2EEnv();
  const supabase = createAdminSupabaseClient(env);
  const { data: experiments, error } = await supabase
    .from("experiments")
    .select("id")
    .eq("product_id", productId);

  if (error) {
    throw new Error(error.message);
  }

  const experimentIds = experiments.map((experiment) => experiment.id);

  if (experimentIds.length === 0) {
    return;
  }

  await supabase.from("visits").delete().in("experiment_id", experimentIds);
  await supabase.from("variants").delete().in("experiment_id", experimentIds);
  await supabase.from("experiments").delete().in("id", experimentIds);
}

/**
 * Seeds a dedicated product for the merchant flow suite and clears stale experiments for it.
 *
 * @returns The seeded product payload.
 */
export async function seedMerchantFlowProduct(): Promise<SeededProduct> {
  const product = await ensureProductExists(
    "playwright-merchant-runner",
    "Playwright Merchant Runner"
  );

  await cleanupProductExperiments(product.id);

  return product;
}

async function upsertPlaywrightUser(
  env: EnvConfig
): Promise<string> {
  const adminSupabase = createAdminSupabaseClient(env);
  const createResult = await adminSupabase.auth.admin.createUser({
    email: env.email,
    password: env.password,
    email_confirm: true,
  });

  if (createResult.data.user) {
    return createResult.data.user.id;
  }

  const listResult = await adminSupabase.auth.admin.listUsers();
  const existingUser = listResult.data?.users.find((user) => user.email === env.email);

  if (!existingUser) {
    throw new Error(createResult.error?.message ?? "Unable to create the Playwright test user.");
  }

  const updateResult = await adminSupabase.auth.admin.updateUserById(existingUser.id, {
    password: env.password,
    email_confirm: true,
  });

  if (updateResult.error || !updateResult.data.user) {
    throw new Error(updateResult.error?.message ?? "Unable to update the Playwright test user.");
  }

  return updateResult.data.user.id;
}

/**
 * Ensures the configured Playwright merchant exists in Supabase auth.
 *
 * @returns The merchant auth user ID.
 */
export async function ensureTestUserExists(): Promise<string> {
  const env = getE2EEnv();
  const anonSupabase = createAnonSupabaseClient(env);
  const signInResult = await anonSupabase.auth.signInWithPassword({
    email: env.email,
    password: env.password,
  });

  if (signInResult.data.user) {
    await anonSupabase.auth.signOut();

    return signInResult.data.user.id;
  }

  return upsertPlaywrightUser(env);
}

/**
 * Resolves the authenticated merchant's user ID using the same Supabase credentials as the UI.
 *
 * @returns The merchant auth user ID.
 */
export async function getTestUserId(): Promise<string> {
  return ensureTestUserExists();
}

/**
 * Signs into the merchant dashboard using the real login form.
 *
 * @param page - Playwright page.
 * @returns Resolves when the browser lands on the dashboard.
 */
export async function loginAsMerchant(page: Page): Promise<void> {
  const env = getE2EEnv();

  await ensureTestUserExists();
  await page.goto("/login");
  await page.getByLabel("Email").fill(env.email);
  await page.getByLabel("Password").fill(env.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/dashboard");
}

/**
 * Creates a live experiment with deterministic variants for auth boundary tests.
 *
 * @returns The seeded experiment ID.
 */
export async function seedLiveExperiment(): Promise<SeededExperiment> {
  const env = getE2EEnv();
  const supabase = createAdminSupabaseClient(env);
  const userId = await getTestUserId();
  const suffix = crypto.randomUUID().slice(0, 8);
  const product = await ensureProductExists(
    `playwright-auth-boundary-runner-${suffix}`,
    "Playwright Auth Boundary Runner"
  );

  const { data: experiment, error: experimentError } = await supabase
    .from("experiments")
    .insert({
      user_id: userId,
      product_id: product.id,
      name: "Playwright auth boundary experiment",
      hypothesis: "A seeded live experiment supports auth boundary coverage.",
      product_context: "Seeded for Playwright auth tests",
      success_metric: "conversion_rate",
      status: "live",
    })
    .select("id")
    .single();

  if (experimentError || !experiment) {
    throw new Error(experimentError?.message ?? "Failed to seed experiment.");
  }

  const { error: variantsError } = await supabase.from("variants").insert([
    {
      experiment_id: experiment.id,
      type: "control",
      target_region: "purchase",
      html: "<div><span data-selected-option=\"size\">9</span><button data-option-group=\"size\" data-option-value=\"8\">8</button><button data-option-group=\"size\" data-option-value=\"9\" data-selected=\"true\">9</button><button data-option-group=\"size\" data-option-value=\"10\">10</button><button data-option-group=\"size\" data-option-value=\"11\">11</button><button data-quantity-action=\"decrease\">-</button><span data-quantity-value>1</span><button data-quantity-action=\"increase\">+</button><button data-primary-cta=\"true\">Add to Cart</button></div>",
      rationale: "Baseline variant for auth tests.",
    },
    {
      experiment_id: experiment.id,
      type: "treatment",
      target_region: "purchase",
      html: "<div><span data-selected-option=\"size\">9</span><button data-option-group=\"size\" data-option-value=\"8\">8</button><button data-option-group=\"size\" data-option-value=\"9\" data-selected=\"true\">9</button><button data-option-group=\"size\" data-option-value=\"10\">10</button><button data-option-group=\"size\" data-option-value=\"11\">11</button><button data-quantity-action=\"decrease\">-</button><span data-quantity-value>1</span><button data-quantity-action=\"increase\">+</button><button data-primary-cta=\"true\">Buy Now</button></div>",
      rationale: "Treatment variant for auth tests.",
    },
  ]);

  if (variantsError) {
    throw new Error(variantsError.message);
  }

  return { experimentId: experiment.id, productSlug: product.slug };
}

/**
 * Deletes a seeded experiment and all dependent test data.
 *
 * @param experimentId - Experiment ID created by Playwright.
 * @returns Resolves when cleanup completes.
 */
export async function cleanupExperiment(experimentId: string): Promise<void> {
  const env = getE2EEnv();
  const supabase = createAdminSupabaseClient(env);

  await supabase.from("visits").delete().eq("experiment_id", experimentId);
  await supabase.from("variants").delete().eq("experiment_id", experimentId);
  await supabase.from("experiments").delete().eq("id", experimentId);
}

/**
 * Sets deterministic product-page cookies for a specific product and variant.
 *
 * @param page - Playwright page.
 * @param productSlug - Product slug whose assignment cookie should be pinned.
 * @param variantType - Sticky variant assignment value.
 * @param visitorId - Sticky anonymous visitor ID.
 * @returns Resolves when cookies have been added to the browser context.
 */
export async function seedStoreCookies(
  page: Page,
  productSlug: string,
  variantType: "control" | "treatment",
  visitorId: string
): Promise<void> {
  const env = getE2EEnv();
  const baseUrl = new URL(env.baseUrl);

  await page.context().addCookies([
    {
      name: "visitor_id",
      value: visitorId,
      domain: baseUrl.hostname,
      path: "/",
    },
    {
      name: `variant_${productSlug}`,
      value: variantType,
      domain: baseUrl.hostname,
      path: "/",
    },
  ]);
}

/**
 * Returns the CTA button locator inside the sandboxed variant iframe.
 *
 * @param page - Playwright page.
 * @param variantType - Variant iframe title prefix.
 * @returns The CTA locator inside the variant iframe.
 */
export function getVariantCta(page: Page, variantType: "control" | "treatment"): Locator {
  return page
    .frameLocator(`iframe[title="${variantType} purchase module"]`)
    .locator("[data-primary-cta=\"true\"]");
}
