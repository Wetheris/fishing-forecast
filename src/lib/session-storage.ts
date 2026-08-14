"use client";

import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { normalizeCatchPhoto } from "@/lib/photo-stamp";
import type {
  CatchDraft,
  FishingCatch,
  FishingSessionDetail,
  FishingSessionSummary,
  PhotoStampSettings,
  SessionConditionSnapshot,
} from "@/types/sessions";

const PHOTO_BUCKET = "catch-photos";

type SessionRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  latitude: number;
  longitude: number;
  location_name: string | null;
  notes: string | null;
  starting_conditions: unknown;
};

type CatchRow = {
  id: string;
  session_id: string;
  caught_at: string;
  latitude: number;
  longitude: number;
  location_name: string | null;
  species: string | null;
  length_value: number | null;
  weight_value: number | null;
  lure_bait: string | null;
  notes: string | null;
  conditions: unknown;
  stamp_settings: unknown;
  original_photo_path: string | null;
  stamped_photo_path: string | null;
  created_at: string;
};

export async function listFishingSessions(): Promise<
  FishingSessionSummary[]
> {
  const supabase = getRequiredSupabaseClient();

  const { data, error } = await supabase
    .from("fishing_sessions")
    .select(
      "id, started_at, ended_at, latitude, longitude, location_name, notes, fishing_catches(count)",
    )
    .order("started_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const catchCountRow =
      Array.isArray(row.fishing_catches) &&
      row.fishing_catches.length > 0
        ? row.fishing_catches[0]
        : null;

    return {
      id: String(row.id),
      startedAt: String(row.started_at),
      endedAt:
        row.ended_at === null
          ? null
          : String(row.ended_at),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      locationName:
        row.location_name === null
          ? null
          : String(row.location_name),
      notes:
        row.notes === null
          ? null
          : String(row.notes),
      catchCount:
        catchCountRow &&
        typeof catchCountRow === "object" &&
        "count" in catchCountRow
          ? Number(catchCountRow.count ?? 0)
          : 0,
    };
  });
}

export async function createFishingSession({
  user,
  latitude,
  longitude,
  locationName,
  notes,
  startingConditions,
}: {
  user: User;
  latitude: number;
  longitude: number;
  locationName?: string;
  notes?: string;
  startingConditions: SessionConditionSnapshot;
}): Promise<string> {
  const supabase = getRequiredSupabaseClient();

  const { data, error } = await supabase
    .from("fishing_sessions")
    .insert({
      user_id: user.id,
      started_at:
        startingConditions.eventTime,
      latitude,
      longitude,
      location_name:
        locationName?.trim() || null,
      notes: notes?.trim() || null,
      starting_conditions:
        startingConditions,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return String(data.id);
}

export async function loadFishingSession(
  id: string,
): Promise<FishingSessionDetail> {
  const supabase = getRequiredSupabaseClient();

  const [
    { data: session, error: sessionError },
    { data: catches, error: catchesError },
  ] = await Promise.all([
    supabase
      .from("fishing_sessions")
      .select(
        "id, started_at, ended_at, latitude, longitude, location_name, notes, starting_conditions",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("fishing_catches")
      .select(
        "id, session_id, caught_at, latitude, longitude, location_name, species, length_value, weight_value, lure_bait, notes, conditions, stamp_settings, original_photo_path, stamped_photo_path, created_at",
      )
      .eq("session_id", id)
      .order("caught_at", {
        ascending: false,
      }),
  ]);

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (catchesError) {
    throw new Error(catchesError.message);
  }

  return {
    ...mapSessionRow(
      session as SessionRow,
    ),
    catches: (catches ?? []).map(
      (row) =>
        mapCatchRow(row as CatchRow),
    ),
  };
}

export async function endFishingSession(
  id: string,
): Promise<void> {
  const supabase = getRequiredSupabaseClient();

  const { error } = await supabase
    .from("fishing_sessions")
    .update({
      ended_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function reopenFishingSession(
  id: string,
): Promise<void> {
  const supabase = getRequiredSupabaseClient();

  const { error } = await supabase
    .from("fishing_sessions")
    .update({
      ended_at: null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createFishingCatch({
  user,
  sessionId,
  draft,
  originalPhoto,
  stampedPhoto,
}: {
  user: User;
  sessionId: string;
  draft: CatchDraft;
  originalPhoto?: File;
  stampedPhoto?: Blob;
}): Promise<string> {
  const supabase = getRequiredSupabaseClient();
  const catchId = crypto.randomUUID();

  const { error: insertError } =
    await supabase
      .from("fishing_catches")
      .insert({
        id: catchId,
        session_id: sessionId,
        user_id: user.id,
        caught_at: draft.caughtAt,
        latitude: draft.latitude,
        longitude: draft.longitude,
        location_name:
          draft.locationName?.trim() ||
          null,
        species:
          draft.species?.trim() || null,
        length_value:
          draft.lengthValue ?? null,
        weight_value:
          draft.weightValue ?? null,
        lure_bait:
          draft.lureBait?.trim() || null,
        notes:
          draft.notes?.trim() || null,
        conditions: draft.conditions,
        stamp_settings:
          draft.stampSettings,
      });

  if (insertError) {
    throw new Error(insertError.message);
  }

  let originalPhotoPath: string | null =
    null;
  let stampedPhotoPath: string | null =
    null;

  try {
    if (originalPhoto) {
      let uploadPhoto: File;

      try {
        uploadPhoto =
          await normalizeCatchPhoto(
            originalPhoto,
          );
      } catch (error) {
        console.warn(
          "Unable to normalize catch photo; skipping photo upload",
          error,
        );
        return catchId;
      }

      originalPhotoPath =
        `${user.id}/${sessionId}/${catchId}/original.jpg`;

      const { error } =
        await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(
            originalPhotoPath,
            uploadPhoto,
            {
              contentType: "image/jpeg",
              upsert: false,
            },
          );

      if (error) {
        throw new Error(error.message);
      }
    }

    if (stampedPhoto) {
      stampedPhotoPath =
        `${user.id}/${sessionId}/${catchId}/stamped.jpg`;

      const { error } =
        await supabase.storage
          .from(PHOTO_BUCKET)
          .upload(
            stampedPhotoPath,
            stampedPhoto,
            {
              contentType: "image/jpeg",
              upsert: false,
            },
          );

      if (error) {
        throw new Error(error.message);
      }
    }

    if (
      originalPhotoPath ||
      stampedPhotoPath
    ) {
      const { error: updateError } =
        await supabase
          .from("fishing_catches")
          .update({
            original_photo_path:
              originalPhotoPath,
            stamped_photo_path:
              stampedPhotoPath,
          })
          .eq("id", catchId);

      if (updateError) {
        throw new Error(
          updateError.message,
        );
      }
    }
  } catch (error) {
    /*
     * A photo problem must not erase a successfully logged catch.
     * Remove partial files, but leave the catch record intact.
     */
    const uploadedPaths = [
      originalPhotoPath,
      stampedPhotoPath,
    ].filter(
      (value): value is string =>
        Boolean(value),
    );

    if (uploadedPaths.length > 0) {
      await supabase.storage
        .from(PHOTO_BUCKET)
        .remove(uploadedPaths);
    }

    console.error(
      "Catch photo upload failed; catch retained without photo",
      error,
    );
  }

  return catchId;
}

export async function createCatchPhotoSignedUrl(
  path: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const supabase = getRequiredSupabaseClient();

  const { data, error } =
    await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(
        path,
        expiresInSeconds,
      );

  if (error) {
    throw new Error(error.message);
  }

  return data.signedUrl;
}

function mapSessionRow(
  row: SessionRow,
): Omit<
  FishingSessionDetail,
  "catches"
> {
  return {
    id: String(row.id),
    startedAt: String(row.started_at),
    endedAt:
      row.ended_at === null
        ? null
        : String(row.ended_at),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    locationName:
      row.location_name === null
        ? null
        : String(row.location_name),
    notes:
      row.notes === null
        ? null
        : String(row.notes),
    startingConditions:
      row.starting_conditions as
        SessionConditionSnapshot,
  };
}

function mapCatchRow(
  row: CatchRow,
): FishingCatch {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    caughtAt: String(row.caught_at),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    locationName:
      row.location_name === null
        ? null
        : String(row.location_name),
    species:
      row.species === null
        ? null
        : String(row.species),
    lengthValue:
      row.length_value === null
        ? null
        : Number(row.length_value),
    weightValue:
      row.weight_value === null
        ? null
        : Number(row.weight_value),
    lureBait:
      row.lure_bait === null
        ? null
        : String(row.lure_bait),
    notes:
      row.notes === null
        ? null
        : String(row.notes),
    conditions:
      row.conditions as
        SessionConditionSnapshot,
    stampSettings:
      row.stamp_settings as
        PhotoStampSettings,
    originalPhotoPath:
      row.original_photo_path === null
        ? null
        : String(row.original_photo_path),
    stampedPhotoPath:
      row.stamped_photo_path === null
        ? null
        : String(row.stamped_photo_path),
    createdAt: String(row.created_at),
  };
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
