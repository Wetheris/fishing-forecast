"use client";

import type { User } from "@supabase/supabase-js";
import type { FishingDashboard } from "@/types/dashboard";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export const LOCAL_DRAFT_KEY =
  "fishing-forecast:dashboard-draft:v1";
export const PENDING_SAVE_KEY =
  "fishing-forecast:pending-cloud-save";

const SHARED_EDIT_KEY_PREFIX =
  "fishing-forecast:shared-edit:";

export type CloudDashboardSummary = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
};

export function loadLocalDashboardDraft():
  | FishingDashboard
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw =
    window.localStorage.getItem(
      LOCAL_DRAFT_KEY,
    );

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      raw,
    ) as FishingDashboard;

    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray(parsed.widgets) ||
      !Array.isArray(parsed.sources) ||
      !Array.isArray(parsed.layouts)
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveLocalDashboardDraft(
  dashboard: FishingDashboard,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    LOCAL_DRAFT_KEY,
    JSON.stringify(dashboard),
  );
}

export function setPendingCloudSave(
  pending: boolean,
) {
  if (typeof window === "undefined") {
    return;
  }

  if (pending) {
    window.localStorage.setItem(
      PENDING_SAVE_KEY,
      "1",
    );
    return;
  }

  window.localStorage.removeItem(
    PENDING_SAVE_KEY,
  );
}

export function hasPendingCloudSave():
  boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.localStorage.getItem(
      PENDING_SAVE_KEY,
    ) === "1"
  );
}

export type SharedDashboardSaveResult = {
  shareToken: string;
  expiresAt: string;
  updatedExisting: boolean;
};

export type SharedDashboardLoadResult = {
  dashboard: FishingDashboard;
  expiresAt: string;
};

type UpdateSharedDashboardRpcRow = {
  share_token: string;
  expires_at: string;
};

type CreateSharedDashboardRpcRow = {
  share_token: string;
  edit_token: string;
  expires_at: string;
};

type GetSharedDashboardRpcRow = {
  name: string;
  dashboard_data: unknown;
  schema_version: number;
  expires_at: string;
};

export async function saveSharedDashboard({
  dashboard,
  existingShareToken,
}: {
  dashboard: FishingDashboard;
  existingShareToken?: string;
}): Promise<SharedDashboardSaveResult> {
  const supabase =
    getRequiredSupabaseClient();

  /*
   * Supplying an existing token means this is strictly an update.
   * Never silently fall through to create_shared_dashboard(), because
   * doing so changes the user's public URL without their permission.
   */
  if (existingShareToken) {
    const editToken = getSharedEditToken(
      existingShareToken,
    );

    if (!editToken) {
      throw new Error(
        "This browser no longer has permission to update the existing saved dashboard URL. A new URL was not created.",
      );
    }

    const {
      data,
      error,
    } = await supabase
      .rpc("update_shared_dashboard", {
        p_share_token:
          existingShareToken,
        p_edit_token: editToken,
        p_name: dashboard.name,
        p_dashboard_data: dashboard,
        p_schema_version: 1,
      })
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    const updatedRow =
      data as
        | UpdateSharedDashboardRpcRow
        | null;

    if (!updatedRow) {
      throw new Error(
        "The existing saved dashboard URL could not be updated. A new URL was not created.",
      );
    }

    return {
      shareToken: String(
        updatedRow.share_token,
      ),
      expiresAt: String(
        updatedRow.expires_at,
      ),
      updatedExisting: true,
    };
  }

  /*
   * A new shared URL is created only when the caller did not supply
   * an existing share token.
   */
  const {
    data,
    error,
  } = await supabase
    .rpc("create_shared_dashboard", {
      p_name: dashboard.name,
      p_dashboard_data: dashboard,
      p_schema_version: 1,
    })
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const createdRow =
    data as CreateSharedDashboardRpcRow;

  const shareToken = String(
    createdRow.share_token,
  );
  const editToken = String(
    createdRow.edit_token,
  );

  storeSharedEditToken(
    shareToken,
    editToken,
  );

  return {
    shareToken,
    expiresAt: String(
      createdRow.expires_at,
    ),
    updatedExisting: false,
  };
}

export async function loadSharedDashboard(
  shareToken: string,
): Promise<SharedDashboardLoadResult> {
  const supabase =
    getRequiredSupabaseClient();

  const {
    data,
    error,
  } = await supabase
    .rpc("get_shared_dashboard", {
      p_share_token: shareToken,
    })
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const sharedRow =
    data as
      | GetSharedDashboardRpcRow
      | null;

  if (!sharedRow) {
    throw new Error(
      "This saved dashboard URL has expired or does not exist.",
    );
  }

  const dashboard =
    sharedRow.dashboard_data as
      FishingDashboard;

  if (
    !dashboard ||
    !Array.isArray(dashboard.widgets) ||
    !Array.isArray(dashboard.sources) ||
    !Array.isArray(dashboard.layouts)
  ) {
    throw new Error(
      "The saved dashboard has an invalid format.",
    );
  }

  return {
    dashboard,
    expiresAt: String(
      sharedRow.expires_at,
    ),
  };
}

function getSharedEditToken(
  shareToken: string,
): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(
    `${SHARED_EDIT_KEY_PREFIX}${shareToken}`,
  );
}

function storeSharedEditToken(
  shareToken: string,
  editToken: string,
) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    `${SHARED_EDIT_KEY_PREFIX}${shareToken}`,
    editToken,
  );
}

export async function saveCloudDashboard({
  dashboard,
  user,
  cloudId,
}: {
  dashboard: FishingDashboard;
  user: User;
  cloudId?: string;
}): Promise<{
  id: string;
  updatedAt: string;
}> {
  const supabase =
    getRequiredSupabaseClient();

  if (cloudId) {
    const { data, error } = await supabase
      .from("dashboards")
      .update({
        name: dashboard.name,
        dashboard_data: dashboard,
        schema_version: 1,
      })
      .eq("id", cloudId)
      .select("id, updated_at")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return {
      id: String(data.id),
      updatedAt: String(data.updated_at),
    };
  }

  const { data, error } = await supabase
    .from("dashboards")
    .insert({
      user_id: user.id,
      name: dashboard.name,
      dashboard_data: dashboard,
      schema_version: 1,
    })
    .select("id, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return {
    id: String(data.id),
    updatedAt: String(data.updated_at),
  };
}

export async function loadCloudDashboard(
  id: string,
): Promise<FishingDashboard> {
  const supabase =
    getRequiredSupabaseClient();

  const { data, error } = await supabase
    .from("dashboards")
    .select("dashboard_data")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const dashboard =
    data.dashboard_data as unknown as
      FishingDashboard;

  if (
    !dashboard ||
    !Array.isArray(dashboard.widgets) ||
    !Array.isArray(dashboard.sources) ||
    !Array.isArray(dashboard.layouts)
  ) {
    throw new Error(
      "The saved dashboard has an invalid format.",
    );
  }

  return dashboard;
}

export async function listCloudDashboards():
  Promise<CloudDashboardSummary[]> {
  const supabase =
    getRequiredSupabaseClient();

  const { data, error } = await supabase
    .from("dashboards")
    .select(
      "id, name, updated_at, created_at",
    )
    .order("updated_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    updatedAt: String(row.updated_at),
    createdAt: String(row.created_at),
  }));
}

export async function deleteCloudDashboard(
  id: string,
): Promise<void> {
  const supabase =
    getRequiredSupabaseClient();

  const { error } = await supabase
    .from("dashboards")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

function getRequiredSupabaseClient() {
  const supabase =
    getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Check .env.local and restart Next.js.",
    );
  }

  return supabase;
}
