import { NewExperimentClientPage } from "@/components/internal/new-experiment-page";
import { getProducts } from "@/lib/products";

export const dynamic = "force-dynamic";

/**
 * Renders the interactive new experiment page.
 *
 * @returns The hypothesis form and generation workflow.
 */
export default async function NewExperimentPage(): Promise<JSX.Element> {
  const products = await getProducts();

  return <NewExperimentClientPage products={products} />;
}
