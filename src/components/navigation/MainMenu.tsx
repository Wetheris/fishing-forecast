"use client";

import Link from "next/link";
import {
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  AuthDialog,
  type AuthDialogMode,
} from "@/components/auth/AuthDialog";
import { useAuth } from "@/components/auth/AuthProvider";

export function MainMenu() {
  const pathname = usePathname();
  const {
    user,
    loading,
    signOut,
    sendPasswordReset,
    resendEmailConfirmation,
  } = useAuth();
  const [open, setOpen] =
    useState(false);
  const [authOpen, setAuthOpen] =
    useState(false);
  const [authMode, setAuthMode] =
    useState<AuthDialogMode>("signin");
  const [accountMessage, setAccountMessage] =
    useState<string>();
  const [accountMessageKind, setAccountMessageKind] =
    useState<"success" | "error">(
      "success",
    );
  const [accountBusy, setAccountBusy] =
    useState(false);

  useEffect(() => {
    setOpen(false);
    setAccountMessage(undefined);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        setOpen(false);
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
  }, [open]);

  function openAuth(
    mode: AuthDialogMode,
  ) {
    setAuthMode(mode);
    setAuthOpen(true);
    setOpen(false);
  }

  async function resendVerification() {
    const email = user?.email;

    if (!email) {
      return;
    }

    setAccountBusy(true);
    setAccountMessage(undefined);

    const result =
      await resendEmailConfirmation(
        email,
      );

    setAccountBusy(false);
    setAccountMessageKind(
      result.ok
        ? "success"
        : "error",
    );
    setAccountMessage(
      result.message ??
        "Unable to send verification email.",
    );
  }

  async function sendReset() {
    const email = user?.email;

    if (!email) {
      return;
    }

    setAccountBusy(true);
    setAccountMessage(undefined);

    const result =
      await sendPasswordReset(
        email,
      );

    setAccountBusy(false);
    setAccountMessageKind(
      result.ok
        ? "success"
        : "error",
    );
    setAccountMessage(
      result.message ??
        "Unable to send password reset email.",
    );
  }

  const emailVerified =
    Boolean(
      user?.email_confirmed_at,
    );

  return (
    <>
      <div
        data-main-menu-root
        data-main-menu-open={open ? "true" : "false"}
        data-path={pathname}
      >
        <button
          data-main-menu-button
          type="button"
          aria-label={
            open
              ? "Close main menu"
              : "Open main menu"
          }
          aria-expanded={open}
          onClick={() =>
            setOpen(
              (current) => !current,
            )
          }
          className="fixed left-3 top-3 z-[950] flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] bg-white/95 text-xl text-[var(--foreground)] shadow-md backdrop-blur transition duration-200 hover:bg-[var(--surface-muted)]"
        >
          {open ? "×" : "☰"}
        </button>

        {open ? (
          <>
            <button
              type="button"
              aria-label="Close main menu"
              onClick={() =>
                setOpen(false)
              }
              className="fixed inset-0 z-[920] bg-slate-950/30"
            />

            <aside className="fixed inset-y-0 left-0 z-[940] flex w-[88vw] max-w-sm flex-col border-r border-[var(--border)] bg-white shadow-2xl">
              <header className="shrink-0 border-b border-[var(--border)] py-5 pl-16 pr-5">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                  TideHawk
                </p>
                <h2 className="mt-1 text-xl font-semibold">
                  Menu
                </h2>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <MenuSection title="Navigate">
                  <MenuLink
                    href="/"
                    icon="⌂"
                    label="Home"
                    detail="App home"
                  />
                  <MenuLink
                    href="/view"
                    icon="▦"
                    label="Dashboard"
                    detail="View your current fishing dashboard"
                  />
                  <MenuLink
                    href="/sessions"
                    icon="🎣"
                    label="Sessions"
                    detail="Trips, catches, photos, and conditions"
                  />
                </MenuSection>

                <MenuSection title="Tools">
                  <MenuLink
                    href="/build"
                    icon="✎"
                    label="Dashboard builder"
                    detail="Edit widgets, layouts, and sources"
                  />
                  <MenuLink
                    href="/dashboards"
                    icon="☁"
                    label="My dashboards"
                    detail="Saved account dashboards"
                  />
                </MenuSection>

                <MenuSection title="Account">
                  {loading ? (
                    <p className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm text-[var(--muted)]">
                      Checking account…
                    </p>
                  ) : !user ? (
                    <div className="grid gap-2">
                      <p className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm text-[var(--muted)]">
                        You can use the public dashboard without an account. Sign in for saved dashboards and Sessions.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          openAuth(
                            "signin",
                          )
                        }
                        className="rounded-xl bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white"
                      >
                        Sign in
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          openAuth(
                            "signup",
                          )
                        }
                        className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium"
                      >
                        Create account
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      <div className="rounded-xl bg-[var(--surface-muted)] p-3">
                        <p className="truncate text-sm font-medium">
                          {user.email ??
                            "Signed in"}
                        </p>
                        <div className="mt-2">
                          <span
                            className={[
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              emailVerified
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800",
                            ].join(" ")}
                          >
                            {emailVerified
                              ? "Email verified"
                              : "Email not verified"}
                          </span>
                        </div>
                      </div>

                      {!emailVerified ? (
                        <button
                          type="button"
                          onClick={() =>
                            void resendVerification()
                          }
                          disabled={
                            accountBusy
                          }
                          className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                        >
                          Resend verification email
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() =>
                          void sendReset()
                        }
                        disabled={
                          accountBusy
                        }
                        className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium disabled:opacity-50"
                      >
                        Send password reset email
                      </button>

                      {accountMessage ? (
                        <p
                          className={[
                            "rounded-xl border p-3 text-sm",
                            accountMessageKind ===
                            "error"
                              ? "border-red-200 bg-red-50 text-red-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800",
                          ].join(" ")}
                        >
                          {accountMessage}
                        </p>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => {
                          void signOut().then(
                            () => {
                              setOpen(
                                false,
                              );
                              window.location.assign(
                                "/view",
                              );
                            },
                          );
                        }}
                        className="rounded-xl px-4 py-2.5 text-sm font-medium text-[var(--muted)] hover:bg-[var(--surface-muted)]"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </MenuSection>
              </div>
            </aside>
          </>
        ) : null}
      </div>

      <AuthDialog
        open={authOpen}
        onClose={() =>
          setAuthOpen(false)
        }
        initialMode={authMode}
        intent="Your fishing account"
      />

      <style>{`
        body:has([data-builder-tools-open="true"])
          [data-main-menu-button] {
          display: none;
        }

        body:has([data-dashboard-controls-hidden="true"])
          [data-main-menu-root][data-main-menu-open="false"]
          [data-main-menu-button] {
          opacity: 0;
          pointer-events: none;
          transform: translateY(-56px);
        }

        body:has([data-main-menu-root][data-path="/build"])
          [data-builder-tools-open="false"] > header {
          padding-left: 4.25rem;
        }

        body:has([data-main-menu-root][data-path^="/sessions"])
          main > header > div,
        body:has([data-main-menu-root][data-path="/dashboards"])
          main > header > div {
          padding-left: 4.75rem;
        }
      `}</style>
    </>
  );
}

function MenuSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 px-1 text-xs font-medium uppercase tracking-[0.16em] text-[var(--muted)]">
        {title}
      </h3>
      <div className="grid gap-2">
        {children}
      </div>
    </section>
  );
}

function MenuLink({
  href,
  icon,
  label,
  detail,
}: {
  href: string;
  icon: string;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition hover:border-[var(--border)] hover:bg-[var(--surface-muted)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-muted)] text-lg">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">
          {label}
        </span>
        <span className="mt-0.5 block text-xs text-[var(--muted)]">
          {detail}
        </span>
      </span>
    </Link>
  );
}
