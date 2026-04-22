import Link from "next/link";

export default function HomePage(): JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-bg px-6 py-16">
      <div className="w-full max-w-4xl rounded-3xl border border-brand-border bg-brand-surface p-10 shadow-glow">
        <p className="font-mono text-sm uppercase tracking-[0.28em] text-brand-accent">
          VariantIQ
        </p>
        <h1 className="mt-6 max-w-2xl font-display text-4xl text-brand-text sm:text-6xl">
          Generate live A/B test variants from a single merchant hypothesis.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-brand-muted">
          Merchants launch experiments from the dashboard, and the live storefront applies those
          variants directly on real product pages.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/login"
            className="rounded-full bg-brand-accent px-6 py-3 text-sm font-semibold text-brand-bg transition hover:opacity-90"
          >
            Open Merchant App
          </Link>
          <Link
            href="/products/pro-runner-elite-x"
            className="rounded-full border border-brand-border px-6 py-3 text-sm font-semibold text-brand-text transition hover:border-brand-accent hover:text-brand-accent"
          >
            Open Live Storefront
          </Link>
        </div>
        <p className="mt-4 text-sm text-brand-muted">
          The storefront stays live at a canonical product URL. Launching an experiment changes
          what shoppers see on that same page.
        </p>
      </div>
    </main>
  );
}
