import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ExperimentDashboard } from "@/components/internal/experiment-dashboard";
import { getDynamicWinnerExperimentId, getExperiment, resolveDashboardBadgeStatus } from "@/lib/experiments";
import { getProduct } from "@/lib/products";
import { createSupabaseServerClient } from "@/lib/supabase";
import { getExperimentDashboardStats } from "@/lib/tracking";

interface ExperimentDetailPageProps {
  params: {
    id: string;
  };
}

function createServerCookieStore(): {
  get(name: string): string | undefined;
  set(name: string, value: string, options: CookieOptions): void;
  remove(name: string, options: CookieOptions): void;
} {
  const cookieStore = cookies();

  return {
    get(name: string) {
      return cookieStore.get(name)?.value;
    },
    set(_name: string, _value: string, _options: CookieOptions) {
      return;
    },
    remove(_name: string, _options: CookieOptions) {
      return;
    },
  };
}

function getDayNumber(createdAt: string): number {
  const createdAtTime = new Date(createdAt).getTime();
  const diffInDays = Math.floor((Date.now() - createdAtTime) / (1000 * 60 * 60 * 24));

  return Math.max(1, diffInDays + 1);
}

/**
 * Renders the experiment detail dashboard with live stats and polling.
 *
 * @param props - Dynamic route params for the selected experiment.
 * @returns The server-rendered experiment detail page shell.
 */
export default async function ExperimentDetailPage({
  params,
}: ExperimentDetailPageProps): Promise<JSX.Element> {
  const supabase = createSupabaseServerClient(createServerCookieStore());
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const experiment = await getExperiment(params.id);

  if (experiment.user_id !== user.id) {
    redirect("/dashboard");
  }

  const initialDashboardStats = await getExperimentDashboardStats(params.id);
  const product = await getProduct(experiment.product_id);
  const dynamicWinnerExperimentId = await getDynamicWinnerExperimentId(user.id);

  return (
    <ExperimentDashboard
      experiment={experiment}
      product={product}
      initialDashboardStats={initialDashboardStats}
      initialDayNumber={getDayNumber(experiment.created_at)}
      badgeStatus={resolveDashboardBadgeStatus(experiment, dynamicWinnerExperimentId)}
    />
  );
}
