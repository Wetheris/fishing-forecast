"use client";

import {
  useMemo,
  useState,
} from "react";

export function DashboardShareDialog({
  open,
  onClose,
  preparing,
  error,
  shareUrl,
  dashboardName,
  locationLabel,
  conditionSummary,
}: {
  open: boolean;
  onClose: () => void;
  preparing: boolean;
  error?: string;
  shareUrl?: string;
  dashboardName: string;
  locationLabel?: string;
  conditionSummary?: string;
}) {
  const [copied, setCopied] =
    useState<
      "link" | "message" | undefined
    >();

  const message = useMemo(
    () =>
      buildShareMessage({
        dashboardName,
        locationLabel,
        conditionSummary,
        shareUrl,
      }),
    [
      conditionSummary,
      dashboardName,
      locationLabel,
      shareUrl,
    ],
  );

  if (!open) {
    return null;
  }

  async function copyText(
    value: string,
    kind: "link" | "message",
  ) {
    try {
      await navigator.clipboard.writeText(
        value,
      );
      setCopied(kind);
      window.setTimeout(
        () => setCopied(undefined),
        1500,
      );
    } catch {
      setCopied(undefined);
    }
  }

  async function nativeShare() {
    if (!shareUrl) {
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: dashboardName,
          text: message,
        });
        return;
      } catch (caught) {
        if (
          caught instanceof DOMException &&
          caught.name === "AbortError"
        ) {
          return;
        }
      }
    }

    await copyText(
      message,
      "message",
    );
  }

  function openTextMessage() {
    if (!shareUrl) {
      return;
    }

    const encoded =
      encodeURIComponent(message);
    const isAppleMobile =
      /iPhone|iPad|iPod/i.test(
        navigator.userAgent,
      );
    const href = isAppleMobile
      ? `sms:&body=${encoded}`
      : `sms:?body=${encoded}`;

    window.location.href = href;
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close share dialog"
        onClick={onClose}
        className="absolute inset-0"
      />

      <section className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[var(--border)] bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--accent)]">
              Share fishing dashboard
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              {dashboardName}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--muted)] hover:bg-[var(--surface-muted)]"
          >
            <XIcon />
          </button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]">
          <div className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                🎣
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold">
                  {dashboardName}
                </p>
                {locationLabel ? (
                  <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
                    {locationLabel}
                  </p>
                ) : null}
              </div>
            </div>

            {conditionSummary ? (
              <p className="mt-4 rounded-xl bg-white p-3 text-sm leading-5">
                {conditionSummary}
              </p>
            ) : null}
          </div>

          <div className="border-t border-[var(--border)] bg-white p-3">
            {preparing ? (
              <p className="text-sm text-[var(--muted)]">
                Preparing a shareable link…
              </p>
            ) : error ? (
              <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            ) : shareUrl ? (
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={shareUrl}
                  aria-label="Shared dashboard URL"
                  className="min-w-0 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() =>
                    void copyText(
                      shareUrl,
                      "link",
                    )
                  }
                  className="shrink-0 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium"
                >
                  {copied === "link"
                    ? "Copied"
                    : "Copy"}
                </button>
              </div>
            ) : null}
          </div>
        </div>

        {shareUrl && !error ? (
          <>
            <div className="mt-4 rounded-2xl border border-[var(--border)] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
                Message preview
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                {message}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={openTextMessage}
                className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white"
              >
                Message
              </button>

              <button
                type="button"
                onClick={() =>
                  void nativeShare()
                }
                className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium"
              >
                Share…
              </button>

              <button
                type="button"
                onClick={() =>
                  void copyText(
                    shareUrl,
                    "link",
                  )
                }
                className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium"
              >
                Copy link
              </button>

              <button
                type="button"
                onClick={() =>
                  void copyText(
                    message,
                    "message",
                  )
                }
                className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium"
              >
                {copied === "message"
                  ? "Copied"
                  : "Copy message"}
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

function buildShareMessage({
  dashboardName,
  locationLabel,
  conditionSummary,
  shareUrl,
}: {
  dashboardName: string;
  locationLabel?: string;
  conditionSummary?: string;
  shareUrl?: string;
}): string {
  const spot = locationLabel
    ? `${dashboardName} — ${locationLabel}`
    : dashboardName;

  return [
    `Check out my fishing spot: ${spot}.`,
    conditionSummary
      ? `Current conditions: ${conditionSummary}.`
      : undefined,
    shareUrl
      ? `View the fishing dashboard: ${shareUrl}`
      : undefined,
  ]
    .filter(
      (line): line is string =>
        Boolean(line),
    )
    .join("\n");
}

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}
