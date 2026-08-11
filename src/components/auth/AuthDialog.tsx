"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";

type AuthMode = "signin" | "signup";

export function AuthDialog({
  open,
  onClose,
  initialMode = "signup",
  intent = "Save your dashboard",
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  intent?: string;
}) {
  const {
    configured,
    signIn,
    signUp,
  } = useAuth();
  const [mode, setMode] =
    useState<AuthMode>(initialMode);
  const [email, setEmail] =
    useState("");
  const [password, setPassword] =
    useState("");
  const [submitting, setSubmitting] =
    useState(false);
  const [message, setMessage] =
    useState<string>();
  const [messageKind, setMessageKind] =
    useState<"success" | "error">(
      "success",
    );

  useEffect(() => {
    if (!open) {
      return;
    }

    setMode(initialMode);
    setPassword("");
    setMessage(undefined);
  }, [initialMode, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(undefined);

    const result =
      mode === "signup"
        ? await signUp(email, password)
        : await signIn(email, password);

    setSubmitting(false);

    if (!result.ok) {
      setMessageKind("error");
      setMessage(
        result.message ??
          "Unable to authenticate.",
      );
      return;
    }

    if (result.needsEmailConfirmation) {
      setMessageKind("success");
      setMessage(result.message);
      return;
    }

    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.currentTarget === event.target
        ) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="auth-dialog-title"
              className="text-lg font-semibold"
            >
              {intent}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {mode === "signup"
                ? "Create an account to keep dashboards synced across devices."
                : "Sign in to access and save your dashboards."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-[var(--muted)] hover:bg-[var(--surface-muted)]"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 rounded-xl bg-[var(--surface-muted)] p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setMessage(undefined);
            }}
            className={[
              "rounded-lg px-3 py-2 text-sm",
              mode === "signup"
                ? "bg-white font-medium shadow-sm"
                : "text-[var(--muted)]",
            ].join(" ")}
          >
            Create account
          </button>

          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setMessage(undefined);
            }}
            className={[
              "rounded-lg px-3 py-2 text-sm",
              mode === "signin"
                ? "bg-white font-medium shadow-sm"
                : "text-[var(--muted)]",
            ].join(" ")}
          >
            Sign in
          </button>
        </div>

        {!configured ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Supabase is not configured. Add
            NEXT_PUBLIC_SUPABASE_URL and
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
            to .env.local, then restart Next.js.
          </p>
        ) : null}

        <form
          onSubmit={handleSubmit}
          className="mt-5 space-y-4"
        >
          <label className="block">
            <span className="text-sm font-medium">
              Email
            </span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-2"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium">
              Password
            </span>
            <input
              type="password"
              autoComplete={
                mode === "signup"
                  ? "new-password"
                  : "current-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value,
                )
              }
              className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-2"
              placeholder="At least 6 characters"
            />
          </label>

          {message ? (
            <p
              className={[
                "rounded-xl border p-3 text-sm",
                messageKind === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : "border-emerald-200 bg-emerald-50 text-emerald-800",
              ].join(" ")}
              role="status"
            >
              {message}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={
              submitting || !configured
            }
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting
              ? "Working..."
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
      </section>
    </div>
  );
}
