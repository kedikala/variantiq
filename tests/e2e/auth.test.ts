import { cleanupExperiment, seedLiveExperiment } from "./helpers";
import { expect, test } from "@playwright/test";

test.describe("auth boundaries", () => {
  let experimentId: string;
  let productSlug: string;

  test.beforeAll(async () => {
    const seededExperiment = await seedLiveExperiment();

    experimentId = seededExperiment.experimentId;
    productSlug = seededExperiment.productSlug;
  });

  test.afterAll(async () => {
    await cleanupExperiment(experimentId);
  });

  test("redirects unauthenticated dashboard requests to login", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fdashboard$/);
  });

  test("redirects unauthenticated new experiment requests to login", async ({ page }) => {
    await page.goto("/experiments/new");

    await expect(page).toHaveURL(/\/login\?redirectTo=%2Fexperiments%2Fnew$/);
  });

  test("loads the public product route without redirecting unauthenticated visitors", async ({
    page,
  }) => {
    await page.goto(`/products/${productSlug}`);

    await expect(page).toHaveURL(new RegExp(`/products/${productSlug}$`));
    await expect(page.getByRole("heading").first()).toContainText("Playwright Auth Boundary Runner");
  });

  test("returns 401 for unauthenticated generate requests", async ({ request }) => {
    const response = await request.post("/api/generate", {
      data: {
        hypothesis: "Test stronger CTA copy",
      },
    });

    expect(response.status()).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required.",
      code: "UNAUTHORIZED",
    });
  });

  test("allows anonymous visit tracking", async ({ request }) => {
    const response = await request.post("/api/track/visit", {
      data: {
        experimentId,
        variantType: "control",
        visitorId: "visitor-auth-boundary",
      },
    });

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });
});
