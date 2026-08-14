"use client";

import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { normalizeCatchPhoto } from "@/lib/photo-stamp";
import type {
  CatchDraft,
  FishingCatch,
  DroneFishingDrop,
  DroneFishingDropDraft,
  DroneFishingDropUpdate,
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


type DroneDropRow = {
  id: string;
  session_id: string;
  rod_label: string;
  drop_number: number;
  dropped_at: string;
  retrieved_at: string | null;
  origin_latitude: number;
  origin_longitude: number;
  latitude: number;
  longitude: number;
  distance_yards: number;
  bearing_degrees: number;
  bait: string | null;
  sinker_oz: number | null;
  estimated_depth_ft: number | null;
  depth_source: "manual" | "unknown";
  conditions: unknown;
  bite_at: string | null;
  caught_fish_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
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


export async function listDroneFishingDrops(
  sessionId: string,
): Promise<DroneFishingDrop[]> {
  const supabase = getRequiredSupabaseClient();

  const { data, error } = await supabase
    .from("fishing_drops")
    .select(
      "id, session_id, rod_label, drop_number, dropped_at, retrieved_at, origin_latitude, origin_longitude, latitude, longitude, distance_yards, bearing_degrees, bait, sinker_oz, estimated_depth_ft, depth_source, conditions, bite_at, caught_fish_at, notes, created_at, updated_at",
    )
    .eq("session_id", sessionId)
    .order("dropped_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) =>
    mapDroneDropRow(row as DroneDropRow),
  );
}

export async function createDroneFishingDrop({
  user,
  sessionId,
  draft,
}: {
  user: User;
  sessionId: string;
  draft: DroneFishingDropDraft;
}): Promise<string> {
  const supabase = getRequiredSupabaseClient();

  const { data, error } = await supabase
    .from("fishing_drops")
    .insert({
      user_id: user.id,
      session_id: sessionId,
      rod_label: draft.rodLabel,
      drop_number: draft.dropNumber,
      dropped_at: draft.droppedAt,
      origin_latitude: draft.originLatitude,
      origin_longitude: draft.originLongitude,
      latitude: draft.latitude,
      longitude: draft.longitude,
      distance_yards: draft.distanceYards,
      bearing_degrees: draft.bearingDegrees,
      bait: draft.bait?.trim() || null,
      sinker_oz: draft.sinkerOz ?? null,
      estimated_depth_ft:
        draft.estimatedDepthFt ?? null,
      depth_source:
        draft.estimatedDepthFt === undefined
          ? "unknown"
          : "manual",
      conditions: draft.conditions,
      notes: draft.notes?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return String(data.id);
}

export async function updateDroneFishingDrop(
  id: string,
  updates: DroneFishingDropUpdate,
): Promise<void> {
  const supabase = getRequiredSupabaseClient();
  const values: Record<string, unknown> = {};

  if ("biteAt" in updates) {
    values.bite_at = updates.biteAt ?? null;
  }
  if ("caughtFishAt" in updates) {
    values.caught_fish_at =
      updates.caughtFishAt ?? null;
  }
  if ("retrievedAt" in updates) {
    values.retrieved_at =
      updates.retrievedAt ?? null;
  }
  if ("notes" in updates) {
    values.notes = updates.notes ?? null;
  }

  if (Object.keys(values).length === 0) {
    return;
  }

  const { error } = await supabase
    .from("fishing_drops")
    .update(values)
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
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


function mapDroneDropRow(
  row: DroneDropRow,
): DroneFishingDrop {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    rodLabel: String(row.rod_label),
    dropNumber: Number(row.drop_number),
    droppedAt: String(row.dropped_at),
    retrievedAt:
      row.retrieved_at === null
        ? null
        : String(row.retrieved_at),
    originLatitude:
      Number(row.origin_latitude),
    originLongitude:
      Number(row.origin_longitude),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    distanceYards:
      Number(row.distance_yards),
    bearingDegrees:
      Number(row.bearing_degrees),
    bait:
      row.bait === null
        ? null
        : String(row.bait),
    sinkerOz:
      row.sinker_oz === null
        ? null
        : Number(row.sinker_oz),
    estimatedDepthFt:
      row.estimated_depth_ft === null
        ? null
        : Number(row.estimated_depth_ft),
    depthSource:
      row.depth_source === "manual"
        ? "manual"
        : "unknown",
    conditions:
      row.conditions as SessionConditionSnapshot,
    biteAt:
      row.bite_at === null
        ? null
        : String(row.bite_at),
    caughtFishAt:
      row.caught_fish_at === null
        ? null
        : String(row.caught_fish_at),
    notes:
      row.notes === null
        ? null
        : String(row.notes),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
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
