"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useAuth } from "@/components/auth/AuthProvider";

export function AccountMenu() {
  const {
    user,
    loading,
    signOut,
  } = useAuth();
  const [authOpen, setAuthOpen] =
    useState(false);

  if (loading) {
    return (
      <span className="px-2 text-xs text-[var(--muted)]">
        Account…
      </span>
    );
  }

  if (!user) {
    return (
      <>
        <button
          type="button"
          onClick={() => setAuthOpen(true)}
          className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
        >
          Sign in
        </button>

        <AuthDialog
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          initialMode="signin"
          intent="Your fishing dashboards"
        />
      </>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/sessions"
        className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
      >
        Sessions
      </Link>

      <Link
        href="/dashboards"
        className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
      >
        My dashboards
      </Link>

      <button
        type="button"
        onClick={() => {
          void signOut().then(() => {
            window.location.assign("/build");
          });
        }}
        className="rounded-xl px-3 py-2 text-sm text-[var(--muted)] hover:bg-[var(--surface-muted)]"
        title={user.email ?? "Signed in"}
      >
        Sign out
      </button>
    </div>
  );
}
