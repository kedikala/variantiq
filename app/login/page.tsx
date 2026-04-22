import { Suspense } from "react";
import { LoginForm } from "@/components/shared/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-bg px-6 py-12">
      <div className="w-full max-w-md rounded-3xl border border-brand-border bg-brand-surface p-8 shadow-glow">
        <p className="font-mono text-xs uppercase tracking-[0.28em] text-brand-accent">
          Merchant Access
        </p>
        <h1 className="mt-4 font-display text-4xl text-brand-text">Sign in to VariantIQ</h1>
        <p className="mt-3 text-sm text-brand-muted">
          Use your merchant email and password to access the dashboard.
        </p>
        <div className="mt-8">
          <Suspense
            fallback={<p className="text-sm text-brand-muted">Loading sign-in options...</p>}
          >
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
