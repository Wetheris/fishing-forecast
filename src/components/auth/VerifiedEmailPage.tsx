"use client";

import Link from "next/link";
import {
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AuthDialog } from "@/components/auth/AuthDialog";

export function VerifiedEmailPage() {
  const {
    user,
    loading,
  } = useAuth();
  const [authOpen, setAuthOpen] =
    useState(false);

  const verified =
    Boolean(
      user?.email_confirmed_at,
    );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)] p-4">
      <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-6 text-center shadow-lg">
        <div className="text-4xl">
          {loading
            ? "…"
            : verified
              ? "✓"
              : "✉"}
        </div>

        <h1 className="mt-3 text-2xl font-semibold">
          {loading
            ? "Finishing verification…"
            : verified
              ? "Email verified"
              : "Verification link processed"}
        </h1>

        <p className="mt-2 text-sm text-[var(--muted)]">
          {loading
            ? "Checking your account."
            : verified
              ? "Your email is confirmed and your account is ready to use."
              : "If your email was confirmed successfully, sign in to continue. You can still use the public dashboard without signing in."}
        </p>

        <div className="mt-5 grid gap-2">
          {verified ? (
            <Link
              href="/view"
              className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
            >
              Go to dashboard
            </Link>
          ) : (
            <button
              type="button"
              onClick={() =>
                setAuthOpen(true)
              }
              className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
            >
              Sign in
            </button>
          )}

          <Link
            href="/"
            className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium"
          >
            Home
          </Link>
        </div>
      </section>

      <AuthDialog
        open={authOpen}
        onClose={() =>
          setAuthOpen(false)
        }
        initialMode="signin"
        intent="Sign in"
      />
    </main>
  );
}
