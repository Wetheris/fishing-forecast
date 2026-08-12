"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export type AuthResult = {
  ok: boolean;
  message?: string;
  needsEmailConfirmation?: boolean;
};

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (
    email: string,
    password: string,
  ) => Promise<AuthResult>;
  signUp: (
    email: string,
    password: string,
  ) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  sendPasswordReset: (
    email: string,
  ) => Promise<AuthResult>;
  updatePassword: (
    password: string,
  ) => Promise<AuthResult>;
  resendEmailConfirmation: (
    email: string,
  ) => Promise<AuthResult>;
};

const AuthContext =
  createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = useMemo(
    () => getSupabaseBrowserClient(),
    [],
  );
  const [user, setUser] =
    useState<User | null>(null);
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) {
          return;
        }

        setUser(
          data.session?.user ?? null,
        );
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function signIn(
    email: string,
    password: string,
  ): Promise<AuthResult> {
    if (!supabase) {
      return notConfigured();
    }

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: true,
    };
  }

  async function signUp(
    email: string,
    password: string,
  ): Promise<AuthResult> {
    if (!supabase) {
      return notConfigured();
    }

    const redirectTo =
      browserUrl("/auth/verified");

    const { data, error } =
      await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    if (!data.session) {
      return {
        ok: true,
        needsEmailConfirmation: true,
        message:
          "Account created. Check your email to verify it. You can keep using the app as a guest while you wait.",
      };
    }

    return {
      ok: true,
      message:
        "Account created and signed in.",
    };
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  }

  async function sendPasswordReset(
    email: string,
  ): Promise<AuthResult> {
    if (!supabase) {
      return notConfigured();
    }

    const redirectTo =
      browserUrl("/auth/reset");

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo,
        },
      );

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: true,
      message:
        "Password reset email sent. Open the link in that email to choose a new password.",
    };
  }

  async function updatePassword(
    password: string,
  ): Promise<AuthResult> {
    if (!supabase) {
      return notConfigured();
    }

    const { error } =
      await supabase.auth.updateUser({
        password,
      });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: true,
      message:
        "Your password has been updated.",
    };
  }

  async function resendEmailConfirmation(
    email: string,
  ): Promise<AuthResult> {
    if (!supabase) {
      return notConfigured();
    }

    const emailRedirectTo =
      browserUrl("/auth/verified");

    const { error } =
      await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo,
        },
      });

    if (error) {
      return {
        ok: false,
        message: error.message,
      };
    }

    return {
      ok: true,
      message:
        "Verification email sent again.",
    };
  }

  const value: AuthContextValue = {
    user,
    loading,
    configured: supabase !== null,
    signIn,
    signUp,
    signOut,
    sendPasswordReset,
    updatePassword,
    resendEmailConfirmation,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider.",
    );
  }

  return context;
}

function browserUrl(
  pathname: string,
): string | undefined {
  if (
    typeof window === "undefined"
  ) {
    return undefined;
  }

  return `${window.location.origin}${pathname}`;
}

function notConfigured(): AuthResult {
  return {
    ok: false,
    message:
      "Supabase is not configured. Check .env.local and restart the app.",
  };
}
