import generatedVariants from "./fixtures/generated-variants.json";
import {
  cleanupExperiment,
  getE2EEnv,
  getVariantCta,
  loginAsMerchant,
  seedMerchantFlowProduct,
  seedStoreCookies,
} from "./helpers";
import { expect, test } from "@playwright/test";

test.describe("merchant flow", () => {
  test.setTimeout(60000);
  let experimentId: string | null = null;
  let productSlug = "playwright-merchant-runner";

  test.afterEach(async () => {
    if (experimentId) {
      await cleanupExperiment(experimentId);
      experimentId = null;
    }
  });

  test("completes login, generation, launch, store visit, and conversion tracking", async ({
    browser,
    page,
  }) => {
    const product = await seedMerchantFlowProduct();
    productSlug = product.slug;

    await page.route("**/api/generate", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(generatedVariants),
      });
    });

    await loginAsMerchant(page);
    await expect(page.getByRole("heading", { name: "Experiments" })).toBeVisible();

    await page.getByRole("link", { name: /\+ New Experiment|Create your first/i }).first().click();
    await page.waitForURL("**/experiments/new");

    await page.getByLabel("Product").selectOption({ label: product.name });
    await page.getByLabel("Hypothesis").fill(
      "Adding urgency-focused CTA copy to the product module will lift conversion rate for this running shoe."
    );
    await page.getByRole("button", { name: /Generate Variants with Codex/i }).click();

    await expect(page.getByText("Variants generated")).toBeVisible();
    await expect(page.getByText(generatedVariants.control.rationale)).toBeVisible();
    await expect(page.getByText(generatedVariants.treatment.rationale)).toBeVisible();
    await expect(
      page
        .frameLocator('iframe[title="Treatment variant preview"]')
        .getByRole("button", { name: "Claim My Pair Today" })
    ).toBeVisible();

    await page.getByRole("button", { name: /Launch Experiment/i }).click();
    await page.waitForURL(/\/experiments\/[0-9a-f-]+$/);

    const currentUrl = new URL(page.url());
    experimentId = currentUrl.pathname.split("/").pop() ?? null;

    expect(experimentId).toMatch(/[0-9a-f-]{36}/);
    await expect(page.getByRole("heading")).toContainText("Adding urgency-focused CTA");

    const shopperContext = await browser.newContext();
    const shopperPage = await shopperContext.newPage();

    await seedStoreCookies(
      shopperPage,
      productSlug,
      "treatment",
      "visitor-e2e-merchant-flow"
    );
    await shopperPage.goto(`${getE2EEnv().baseUrl}/products/${productSlug}`);

    await expect(shopperPage).toHaveURL(new RegExp(`/products/${productSlug}$`));
    await expect(getVariantCta(shopperPage, "treatment")).toContainText("Claim My Pair Today");

    await getVariantCta(shopperPage, "treatment").click();
    await expect(getVariantCta(shopperPage, "treatment")).toContainText("Added to cart! ✓");
    await shopperContext.close();

    await page.goto(`/experiments/${experimentId}`);
    await expect(page.getByRole("heading")).toContainText("Adding urgency-focused CTA");
    await expect(
      page
        .locator("div")
        .filter({ has: page.getByText("Total visitors") })
        .getByText(/^1$/)
        .first()
    ).toBeVisible();
    await expect(
      page
        .locator("div")
        .filter({ has: page.getByText("Total conversions") })
        .getByText(/^1$/)
        .first()
    ).toBeVisible();
  });
});
