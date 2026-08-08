"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button, Field, Panel } from "@/components/ui";

function AuthFormInner({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const name = String(formData.get("name") ?? "");

    const result =
      mode === "signup"
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });

    setPending(false);

    if (result.error) {
      setError(result.error.message ?? "Something went wrong.");
      return;
    }

    router.push(nextPath.startsWith("/") ? nextPath : "/dashboard");
    router.refresh();
  }

  return (
    <Panel className="mx-auto w-full max-w-md">
      <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight">
        {mode === "signup" ? "Create your account" : "Welcome back"}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {mode === "signup"
          ? "Start a campaign as GM, then invite your table with a link."
          : "Sign in to open shared campaign notes."}
      </p>

      <form action={onSubmit} className="mt-6 space-y-4">
        {mode === "signup" ? (
          <Field label="Display name" name="name" required placeholder="Ethan" />
        ) : null}
        <Field
          label="Email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          required
          placeholder="At least 8 characters"
        />

        {error ? (
          <p className="rounded-lg border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-warn">
            {error}
          </p>
        ) : null}

        <Button className="w-full" type="submit">
          {pending
            ? "Working…"
            : mode === "signup"
              ? "Sign up"
              : "Log in"}
        </Button>
      </form>

      <p className="mt-5 text-sm text-ink-soft">
        {mode === "signup" ? (
          <>
            Already have an account?{" "}
            <Link
              href={`/login${nextPath !== "/dashboard" ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
              className="text-accent-deep underline-offset-2 hover:underline"
            >
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              href={`/signup${nextPath !== "/dashboard" ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
              className="text-accent-deep underline-offset-2 hover:underline"
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </Panel>
  );
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  return (
    <Suspense fallback={<Panel className="mx-auto w-full max-w-md">Loading…</Panel>}>
      <AuthFormInner mode={mode} />
    </Suspense>
  );
}
