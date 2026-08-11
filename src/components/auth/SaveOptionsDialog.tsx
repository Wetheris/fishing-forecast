"use client";

import {
  useEffect,
  useState,
} from "react";

type SaveOptionsMode =
  | "guest"
  | "url-only";

export function SaveOptionsDialog({
  open,
  mode,
  savingUrl,
  sharedUrl,
  expiresAt,
  error,
  onClose,
  onSaveToAccount,
  onSaveToUrl,
}: {
  open: boolean;
  mode: SaveOptionsMode;
  savingUrl: boolean;
  sharedUrl?: string;
  expiresAt?: string;
  error?: string;
  onClose: () => void;
  onSaveToAccount: () => void;
  onSaveToUrl: () => void;
}) {
  const [copied, setCopied] =
    useState(false);

  useEffect(() => {
    if (open) {
      setCopied(false);
    }
  }, [open, sharedUrl]);

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

  async function copyUrl() {
    if (!sharedUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        sharedUrl,
      );
      setCopied(true);
    } catch {
      setCopied(false);
    }
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
        aria-labelledby="save-options-title"
        className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-white p-5 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="save-options-title"
              className="text-lg font-semibold"
            >
              {mode === "guest"
                ? "Save dashboard"
                : "Save to a URL"}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {mode === "guest"
                ? "Keep it in an account, or create an anonymous link without signing up."
                : "Create an anonymous link to this dashboard."}
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

        {sharedUrl ? (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="font-medium text-emerald-900">
              Dashboard URL created
            </p>

            <div className="mt-3 flex gap-2">
              <input
                readOnly
                value={sharedUrl}
                aria-label="Saved dashboard URL"
                className="min-w-0 flex-1 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void copyUrl()}
                className="shrink-0 rounded-xl bg-emerald-700 px-3 py-2 text-sm font-medium text-white"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>

            <p className="mt-3 text-xs leading-5 text-emerald-900/80">
              This link expires after 90 days
              without being opened. Every visit
              resets the 90-day timer.
              {expiresAt
                ? ` Current expiration: ${formatExpiration(
                    expiresAt,
                  )}.`
                : ""}
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {mode === "guest" ? (
              <button
                type="button"
                onClick={onSaveToAccount}
                className="w-full rounded-2xl border border-[var(--border)] p-4 text-left hover:bg-[var(--surface-muted)]"
              >
                <span className="font-medium">
                  Create account or sign in
                </span>
                <span className="mt-1 block text-sm text-[var(--muted)]">
                  Keep dashboards private, sync
                  them across devices, and manage
                  them from My Dashboards.
                </span>
              </button>
            ) : null}

            <button
              type="button"
              disabled={savingUrl}
              onClick={onSaveToUrl}
              className="w-full rounded-2xl border border-[var(--accent)] bg-[var(--selection)] p-4 text-left disabled:opacity-60"
            >
              <span className="font-medium text-[var(--accent)]">
                {savingUrl
                  ? "Creating URL…"
                  : "Save to a URL"}
              </span>
              <span className="mt-1 block text-sm text-[var(--muted)]">
                No account required. The saved
                dashboard is deleted after 90 days
                without anyone opening the link.
              </span>
            </button>
          </div>
        )}

        {error ? (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </section>
    </div>
  );
}

function formatExpiration(
  value: string,
): string {
  try {
    return new Intl.DateTimeFormat(
      "en-US",
      {
        dateStyle: "medium",
      },
    ).format(new Date(value));
  } catch {
    return value;
  }
}
