"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient, hasSupabasePublicEnv } from "@/lib/supabase";

interface FormState {
  email: string;
  password: string;
}

function validateForm({ email, password }: FormState): string | null {
  if (!email.trim()) {
    return "Email is required.";
  }

  if (!email.includes("@")) {
    return "Enter a valid email address.";
  }

  if (!password.trim()) {
    return "Password is required.";
  }

  if (password.length < 6) {
    return "Password must be at least 6 characters.";
  }

  return null;
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const supabase = useMemo(() => {
    if (!hasSupabasePublicEnv()) {
      return null;
    }

    return createSupabaseBrowserClient();
  }, []);
  const [formState, setFormState] = useState<FormState>({ email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleEmailPasswordSignIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setErrorMessage(
        "Supabase environment variables are missing. Add them to .env.local before signing in."
      );
      return;
    }

    const validationError = validateForm(formState);
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const { error } = await supabase.auth.signInWithPassword({
        email: formState.email,
        password: formState.password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <form className="space-y-4" onSubmit={handleEmailPasswordSignIn}>
        <label className="block text-sm text-brand-text">
          <span className="mb-2 block">Email</span>
          <input
            type="email"
            value={formState.email}
            onChange={(event) =>
              setFormState((currentState) => ({ ...currentState, email: event.target.value }))
            }
            className="w-full rounded-2xl border border-brand-border bg-brand-bg px-4 py-3 text-brand-text outline-none transition focus:border-brand-accent"
            placeholder="merchant@variantiq.dev"
            autoComplete="email"
          />
        </label>

        <label className="block text-sm text-brand-text">
          <span className="mb-2 block">Password</span>
          <input
            type="password"
            value={formState.password}
            onChange={(event) =>
              setFormState((currentState) => ({ ...currentState, password: event.target.value }))
            }
            className="w-full rounded-2xl border border-brand-border bg-brand-bg px-4 py-3 text-brand-text outline-none transition focus:border-brand-accent"
            placeholder="Enter your password"
            autoComplete="current-password"
          />
        </label>

        {errorMessage ? (
          <p className="rounded-2xl border border-brand-warning/40 bg-brand-warning/10 px-4 py-3 text-sm text-brand-warning">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-brand-accent px-5 py-3 text-sm font-semibold text-brand-bg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
