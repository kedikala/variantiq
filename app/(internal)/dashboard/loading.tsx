function SkeletonCard(): JSX.Element {
  return (
    <div className="animate-pulse rounded-3xl border border-brand-border bg-brand-surface p-6">
      <div className="h-4 w-24 rounded-full bg-brand-border" />
      <div className="mt-6 h-8 w-56 rounded-full bg-brand-border" />
      <div className="mt-4 h-4 w-full rounded-full bg-brand-border" />
      <div className="mt-3 h-4 w-5/6 rounded-full bg-brand-border" />
      <div className="mt-6 grid gap-4 rounded-3xl border border-brand-border bg-brand-bg/70 p-5 sm:grid-cols-2">
        <div className="h-16 rounded-2xl bg-brand-border" />
        <div className="h-16 rounded-2xl bg-brand-border" />
        <div className="h-16 rounded-2xl bg-brand-border" />
        <div className="h-16 rounded-2xl bg-brand-border" />
      </div>
    </div>
  );
}

/**
 * Renders the dashboard loading skeleton while experiment cards are fetched.
 *
 * @returns A three-card skeleton state.
 */
export default function DashboardLoading(): JSX.Element {
  return (
    <main className="min-h-screen bg-brand-bg px-6 py-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-brand-border bg-brand-surface p-8 shadow-glow">
          <div className="h-4 w-28 animate-pulse rounded-full bg-brand-border" />
          <div className="mt-5 h-10 w-56 animate-pulse rounded-full bg-brand-border" />
        </section>
        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </section>
      </div>
    </main>
  );
}
