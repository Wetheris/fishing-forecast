"use client";

import Link from "next/link";
import {
  FormEvent,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function ResetPasswordPage() {
  const {
    user,
    loading,
    updatePassword,
  } = useAuth();
  const [password, setPassword] =
    useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [success, setSuccess] =
    useState(false);
  const [message, setMessage] =
    useState<string>();

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setMessage(undefined);

    if (password.length < 6) {
      setMessage(
        "Password must be at least 6 characters.",
      );
      return;
    }

    if (
      password !== confirmPassword
    ) {
      setMessage(
        "The passwords do not match.",
      );
      return;
    }

    setSubmitting(true);

    const result =
      await updatePassword(
        password,
      );

    setSubmitting(false);

    if (!result.ok) {
      setMessage(
        result.message ??
          "Unable to update password.",
      );
      return;
    }

    setSuccess(true);
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)] p-4">
      <section className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-6 shadow-lg">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
          Fishing Forecast
        </p>
        <h1 className="mt-2 text-2xl font-semibold">
          Reset password
        </h1>

        {loading ? (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Opening your secure reset session…
          </p>
        ) : success ? (
          <div className="mt-5">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              Your password has been updated.
            </p>
            <Link
              href="/view"
              className="mt-4 block rounded-xl bg-[var(--accent)] px-4 py-2.5 text-center text-sm font-medium text-white"
            >
              Go to dashboard
            </Link>
          </div>
        ) : !user ? (
          <div className="mt-5">
            <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              This reset session is not available. The link may have expired or already been used. Request another password reset from the main menu.
            </p>
            <Link
              href="/view"
              className="mt-4 block rounded-xl border border-[var(--border)] px-4 py-2.5 text-center text-sm font-medium"
            >
              Return to dashboard
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-5 space-y-4"
          >
            <p className="text-sm text-[var(--muted)]">
              Updating password for{" "}
              <span className="font-medium text-[var(--foreground)]">
                {user.email}
              </span>
            </p>

            <label className="block">
              <span className="text-sm font-medium">
                New password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-2.5"
                placeholder="At least 6 characters"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">
                Confirm new password
              </span>
              <input
                type="password"
                autoComplete="new-password"
                minLength={6}
                required
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value,
                  )
                }
                className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-2.5"
              />
            </label>

            {message ? (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {submitting
                ? "Updating…"
                : "Update password"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
