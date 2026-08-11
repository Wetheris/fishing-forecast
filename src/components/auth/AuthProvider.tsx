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

type AuthResult = {
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
      return {
        ok: false,
        message:
          "Supabase is not configured. Check .env.local and restart the app.",
      };
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
      return {
        ok: false,
        message:
          "Supabase is not configured. Check .env.local and restart the app.",
      };
    }

    const redirectTo =
      typeof window === "undefined"
        ? undefined
        : `${window.location.origin}/build`;

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
          "Check your email to confirm your account. Your dashboard draft is saved locally and will be ready when you return.",
      };
    }

    return {
      ok: true,
    };
  }

  async function signOut() {
    if (!supabase) {
      return;
    }

    await supabase.auth.signOut();
  }

  const value: AuthContextValue = {
    user,
    loading,
    configured: supabase !== null,
    signIn,
    signUp,
    signOut,
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
