"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  createStampedCatchPhoto,
  normalizeCatchPhoto,
} from "@/lib/photo-stamp";
import {
  updateFishingCatchDetails,
} from "@/lib/session-storage";
import type {
  FishingCatch,
} from "@/types/sessions";

const MAX_PHOTO_BYTES =
  20 * 1024 * 1024;

export function DroneCatchDetailsDialog({
  catchItem,
  onClose,
  onSaved,
}: {
  catchItem: FishingCatch;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const cameraInputRef =
    useRef<HTMLInputElement>(null);
  const libraryInputRef =
    useRef<HTMLInputElement>(null);

  const [photo, setPhoto] =
    useState<File>();
  const [photoPreview, setPhotoPreview] =
    useState<string>();

  const [species, setSpecies] =
    useState(catchItem.species ?? "");
  const [lengthValue, setLengthValue] =
    useState(
      catchItem.lengthValue?.toString() ??
        "",
    );
  const [weightValue, setWeightValue] =
    useState(
      catchItem.weightValue?.toString() ??
        "",
    );
  const [lureBait, setLureBait] =
    useState(
      catchItem.lureBait ?? "",
    );
  const [notes, setNotes] =
    useState(
      catchItem.notes ?? "",
    );

  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState<string>();
  const [status, setStatus] =
    useState<string>();

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(undefined);
      return;
    }

    const url =
      URL.createObjectURL(photo);
    setPhotoPreview(url);

    return () =>
      URL.revokeObjectURL(url);
  }, [photo]);

  function choosePhoto(
    file: File | undefined,
  ) {
    if (!file) {
      return;
    }

    if (
      !file.type.startsWith("image/")
    ) {
      setError(
        "Please choose an image file.",
      );
      return;
    }

    if (
      file.size > MAX_PHOTO_BYTES
    ) {
      setError(
        "Photo must be 20 MB or smaller.",
      );
      return;
    }

    setPhoto(file);
    setError(undefined);
  }

  async function save() {
    if (!user) {
      setError(
        "Sign in before updating this catch.",
      );
      return;
    }

    setSaving(true);
    setError(undefined);

    try {
      let normalizedPhoto:
        | File
        | undefined;
      let stampedPhoto:
        | Blob
        | undefined;

      if (photo) {
        setStatus(
          "Preparing photo…",
        );

        normalizedPhoto =
          await normalizeCatchPhoto(
            photo,
          );

        setStatus(
          "Creating photo stamp…",
        );

        stampedPhoto =
          await createStampedCatchPhoto({
            file: normalizedPhoto,
            context: {
              caughtAt:
                catchItem.caughtAt,
              species,
              locationName:
                catchItem.locationName ??
                undefined,
              latitude:
                catchItem.latitude,
              longitude:
                catchItem.longitude,
              lureBait,
              conditions:
                catchItem.conditions,
            },
            settings:
              catchItem.stampSettings,
          });
      }

      setStatus(
        "Saving catch details…",
      );

      await updateFishingCatchDetails({
        user,
        catchItem,
        details: {
          species,
          lengthValue:
            parseOptionalNumber(
              lengthValue,
            ),
          weightValue:
            parseOptionalNumber(
              weightValue,
            ),
          lureBait,
          notes,
        },
        originalPhoto:
          normalizedPhoto,
        stampedPhoto,
      });

      onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to save catch details.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 sm:items-center sm:p-4">
      <section className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">
                Catch details
              </h2>
              <span className="rounded-full bg-[var(--selection)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--accent)]">
                Drone
              </span>
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              The catch is already saved. Everything here is optional and can be added later.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
          >
            Later
          </button>
        </div>

        <div className="mt-5">
          {photoPreview ? (
            <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Catch preview"
                className="max-h-72 w-full object-contain"
              />
            </div>
          ) : (
            <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] px-4 text-center text-sm text-[var(--muted)]">
              {catchItem.originalPhotoPath
                ? "A photo is already saved. Choose another photo to replace it."
                : "Add a catch photo now, or come back later."}
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                cameraInputRef.current?.click()
              }
              className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white"
            >
              📷 Take photo
            </button>
            <button
              type="button"
              onClick={() =>
                libraryInputRef.current?.click()
              }
              className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium"
            >
              🖼️ Camera roll
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              choosePhoto(
                event.target.files?.[0],
              );
              event.currentTarget.value =
                "";
            }}
          />
          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              choosePhoto(
                event.target.files?.[0],
              );
              event.currentTarget.value =
                "";
            }}
          />
        </div>

        <div className="mt-5 rounded-2xl bg-[var(--surface-muted)] p-3">
          <p className="text-xs text-[var(--muted)]">
            Saved drop location
          </p>
          <p className="mt-1 font-mono text-sm font-semibold">
            {catchItem.latitude.toFixed(
              6,
            )}
            ,{" "}
            {catchItem.longitude.toFixed(
              6,
            )}
          </p>
          {catchItem.locationName ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              {catchItem.locationName}
            </p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field
            label="Species"
            value={species}
            onChange={setSpecies}
            placeholder="Striped bass"
          />
          <Field
            label="Length (in)"
            value={lengthValue}
            onChange={setLengthValue}
            placeholder="Optional"
            decimal
          />
          <Field
            label="Weight (lb)"
            value={weightValue}
            onChange={setWeightValue}
            placeholder="Optional"
            decimal
          />
          <Field
            label="Bait / lure"
            value={lureBait}
            onChange={setLureBait}
            placeholder="Bunker, mullet, clam..."
          />
        </div>

        <label className="mt-4 grid gap-1 text-sm">
          <span className="font-medium">
            Notes
          </span>
          <textarea
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value,
              )
            }
            rows={3}
            placeholder="Anything worth remembering about this catch..."
            className="resize-none rounded-xl border border-[var(--border)] px-3 py-2.5"
          />
        </label>

        {status ? (
          <p className="mt-4 rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--muted)]">
            {status}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-medium"
          >
            Do later
          </button>
          <button
            type="button"
            onClick={() =>
              void save()
            }
            disabled={saving}
            className="rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving
              ? "Saving…"
              : "Save details"}
          </button>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  decimal = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  decimal?: boolean;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">
        {label}
      </span>
      <input
        inputMode={
          decimal
            ? "decimal"
            : undefined
        }
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value,
          )
        }
        placeholder={placeholder}
        className="rounded-xl border border-[var(--border)] px-3 py-2.5"
      />
    </label>
  );
}

function parseOptionalNumber(
  value: string,
): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : undefined;
}
