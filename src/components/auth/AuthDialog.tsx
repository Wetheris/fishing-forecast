"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export type AuthDialogMode =
  | "signin"
  | "signup";

type DialogView =
  | AuthDialogMode
  | "reset";

export function AuthDialog({
  open,
  onClose,
  initialMode = "signup",
  intent = "Your fishing account",
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: AuthDialogMode;
  intent?: string;
}) {
  const {
    configured,
    signIn,
    signUp,
    sendPasswordReset,
    resendEmailConfirmation,
  } = useAuth();
  const [view, setView] =
    useState<DialogView>(initialMode);
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
  const [needsVerification, setNeedsVerification] =
    useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setView(initialMode);
    setPassword("");
    setMessage(undefined);
    setNeedsVerification(false);
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
    setNeedsVerification(false);

    if (view === "reset") {
      const result =
        await sendPasswordReset(
          email.trim(),
        );
      setSubmitting(false);
      setMessageKind(
        result.ok
          ? "success"
          : "error",
      );
      setMessage(
        result.message ??
          "Unable to send password reset email.",
      );
      return;
    }

    const result =
      view === "signup"
        ? await signUp(
            email.trim(),
            password,
          )
        : await signIn(
            email.trim(),
            password,
          );

    setSubmitting(false);

    if (!result.ok) {
      const verificationError =
        view === "signin" &&
        Boolean(
          result.message
            ?.toLowerCase()
            .includes(
              "email not confirmed",
            ),
        );

      setNeedsVerification(
        verificationError,
      );
      setMessageKind("error");
      setMessage(
        verificationError
          ? "Your email has not been verified yet. You can resend the verification email below or continue using the app as a guest."
          : result.message ??
              "Unable to authenticate.",
      );
      return;
    }

    if (
      result.needsEmailConfirmation
    ) {
      setNeedsVerification(true);
      setMessageKind("success");
      setMessage(result.message);
      return;
    }

    onClose();
  }

  async function resendVerification() {
    if (!email.trim()) {
      return;
    }

    setSubmitting(true);
    const result =
      await resendEmailConfirmation(
        email.trim(),
      );
    setSubmitting(false);
    setMessageKind(
      result.ok
        ? "success"
        : "error",
    );
    setMessage(
      result.message ??
        "Unable to resend verification email.",
    );
  }

  function changeView(
    next: DialogView,
  ) {
    setView(next);
    setPassword("");
    setMessage(undefined);
    setNeedsVerification(false);
  }

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/55 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.currentTarget ===
          event.target
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
              {view === "reset"
                ? "Reset password"
                : intent}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {view === "signup"
                ? "Create an account for saved dashboards, sessions, and catch photos."
                : view === "signin"
                  ? "Sign in to access your saved fishing data."
                  : "Enter your email and we will send you a secure reset link."}
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

        {view !== "reset" ? (
          <div className="mt-5 grid grid-cols-2 rounded-xl bg-[var(--surface-muted)] p-1">
            <button
              type="button"
              onClick={() =>
                changeView("signup")
              }
              className={[
                "rounded-lg px-3 py-2 text-sm",
                view === "signup"
                  ? "bg-white font-medium shadow-sm"
                  : "text-[var(--muted)]",
              ].join(" ")}
            >
              Create account
            </button>

            <button
              type="button"
              onClick={() =>
                changeView("signin")
              }
              className={[
                "rounded-lg px-3 py-2 text-sm",
                view === "signin"
                  ? "bg-white font-medium shadow-sm"
                  : "text-[var(--muted)]",
              ].join(" ")}
            >
              Sign in
            </button>
          </div>
        ) : null}

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
                setEmail(
                  event.target.value,
                )
              }
              className="mt-2 w-full rounded-xl border border-[var(--border)] px-3 py-2"
              placeholder="you@example.com"
            />
          </label>

          {view !== "reset" ? (
            <label className="block">
              <span className="text-sm font-medium">
                Password
              </span>
              <input
                type="password"
                autoComplete={
                  view === "signup"
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
          ) : null}

          {view === "signin" ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() =>
                  changeView("reset")
                }
                className="text-sm font-medium text-[var(--accent)] hover:underline"
              >
                Forgot password?
              </button>
            </div>
          ) : null}

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

          {needsVerification ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  void resendVerification()
                }
                disabled={
                  submitting ||
                  !configured
                }
                className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-medium disabled:opacity-50"
              >
                Resend verification
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm font-medium"
              >
                Continue using app
              </button>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={
              submitting ||
              !configured
            }
            className="w-full rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting
              ? "Working..."
              : view === "signup"
                ? "Create account"
                : view === "signin"
                  ? "Sign in"
                  : "Send reset link"}
          </button>

          {view === "reset" ? (
            <button
              type="button"
              onClick={() =>
                changeView("signin")
              }
              className="w-full rounded-xl px-4 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-muted)]"
            >
              Back to sign in
            </button>
          ) : null}
        </form>
      </section>
    </div>
  );
}
