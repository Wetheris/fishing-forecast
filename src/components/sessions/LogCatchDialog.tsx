"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LocationPickerMap } from "@/components/sessions/LocationPickerMap";
import { collectSessionConditions } from "@/lib/session-conditions";
import { createFishingCatch } from "@/lib/session-storage";
import {
  createStampedCatchPhoto,
  shareOrDownloadPhoto,
} from "@/lib/photo-stamp";
import {
  DEFAULT_PHOTO_STAMP_SETTINGS,
  type FishingSessionDetail,
  type PhotoStampSettings,
} from "@/types/sessions";

const STAMP_SETTINGS_KEY =
  "fishing-forecast:photo-stamp:v1";
const DEVICE_SAVE_KEY =
  "fishing-forecast:photo-device-save:v1";
const MAX_PHOTO_BYTES =
  20 * 1024 * 1024;

export function LogCatchDialog({
  session,
  onClose,
  onSaved,
}: {
  session: FishingSessionDetail;
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
  const [caughtAt, setCaughtAt] =
    useState(
      toDatetimeLocalValue(
        new Date(),
      ),
    );
  const [latitude, setLatitude] =
    useState(session.latitude);
  const [longitude, setLongitude] =
    useState(session.longitude);
  const [locationName, setLocationName] =
    useState(
      session.locationName ?? "",
    );
  const [locationMode, setLocationMode] =
    useState<
      "session" | "gps" | "map" | "manual"
    >("session");
  const [species, setSpecies] =
    useState("");
  const [lengthValue, setLengthValue] =
    useState("");
  const [weightValue, setWeightValue] =
    useState("");
  const [lureBait, setLureBait] =
    useState("");
  const [notes, setNotes] =
    useState("");
  const [stampSettings, setStampSettings] =
    useState<PhotoStampSettings>(
      DEFAULT_PHOTO_STAMP_SETTINGS,
    );
  const [offerDeviceSave, setOfferDeviceSave] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [locationBusy, setLocationBusy] =
    useState(false);
  const [error, setError] =
    useState<string>();
  const [status, setStatus] =
    useState<string>();
  const [savedStamp, setSavedStamp] =
    useState<Blob>();
  const [savedFilename, setSavedFilename] =
    useState<string>();

  useEffect(() => {
    const raw =
      window.localStorage.getItem(
        STAMP_SETTINGS_KEY,
      );

    if (raw) {
      try {
        setStampSettings({
          ...DEFAULT_PHOTO_STAMP_SETTINGS,
          ...(JSON.parse(
            raw,
          ) as Partial<PhotoStampSettings>),
        });
      } catch {
        // Keep defaults.
      }
    }

    setOfferDeviceSave(
      window.localStorage.getItem(
        DEVICE_SAVE_KEY,
      ) !== "0",
    );
  }, []);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(undefined);
      return;
    }

    const url =
      URL.createObjectURL(photo);
    setPhotoPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photo]);

  function choosePhoto(
    file: File | undefined,
  ) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please choose an image file.",
      );
      return;
    }

    if (file.size > MAX_PHOTO_BYTES) {
      setError(
        "Photo must be 20 MB or smaller.",
      );
      return;
    }

    setPhoto(file);
    setError(undefined);
  }

  function updateStampSetting<
    K extends keyof PhotoStampSettings,
  >(
    key: K,
    value: PhotoStampSettings[K],
  ) {
    const next = {
      ...stampSettings,
      [key]: value,
    };

    setStampSettings(next);
    window.localStorage.setItem(
      STAMP_SETTINGS_KEY,
      JSON.stringify(next),
    );
  }

  async function useCurrentLocation() {
    setLocationBusy(true);
    setError(undefined);

    try {
      const position =
        await getDeviceLocation();
      setLatitude(position.latitude);
      setLongitude(position.longitude);
      setLocationMode("gps");
      setStatus(
        `GPS updated · ±${Math.round(
          position.accuracy,
        )} m`,
      );
    } catch {
      setError(
        "Unable to get the current GPS location.",
      );
    } finally {
      setLocationBusy(false);
    }
  }

  function useSessionLocation() {
    setLatitude(session.latitude);
    setLongitude(session.longitude);
    setLocationName(
      session.locationName ?? "",
    );
    setLocationMode("session");
    setStatus(
      "Using the session location.",
    );
  }

  async function handleSave() {
    if (!user) {
      setError(
        "Sign in before logging a catch.",
      );
      return;
    }

    const eventDate =
      new Date(caughtAt);

    if (
      Number.isNaN(
        eventDate.getTime(),
      )
    ) {
      setError(
        "Confirm a valid catch time.",
      );
      return;
    }

    if (
      !isValidCoordinates(
        latitude,
        longitude,
      )
    ) {
      setError(
        "A valid catch location is required.",
      );
      return;
    }

    setSaving(true);
    setError(undefined);
    setStatus(
      "Capturing conditions for this catch…",
    );

    try {
      const caughtAtIso =
        eventDate.toISOString();
      const conditions =
        await collectSessionConditions({
          latitude,
          longitude,
          eventTime: caughtAtIso,
        });

      let stampedPhoto:
        | Blob
        | undefined;

      if (photo) {
        setStatus(
          "Creating photo stamp…",
        );

        try {
          stampedPhoto =
            await createStampedCatchPhoto({
              file: photo,
              context: {
                caughtAt: caughtAtIso,
                species,
                locationName,
                latitude,
                longitude,
                lureBait,
                conditions,
              },
              settings:
                stampSettings,
            });
        } catch (stampError) {
          console.warn(
            "Unable to generate stamped photo",
            stampError,
          );
        }
      }

      setStatus(
        "Saving catch…",
      );

      await createFishingCatch({
        user,
        sessionId: session.id,
        draft: {
          caughtAt: caughtAtIso,
          latitude,
          longitude,
          locationName,
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
          conditions,
          stampSettings,
        },
        originalPhoto: photo,
        stampedPhoto,
      });

      if (
        stampedPhoto &&
        offerDeviceSave
      ) {
        setSavedStamp(
          stampedPhoto,
        );
        setSavedFilename(
          catchFilename(
            species,
            caughtAtIso,
          ),
        );
        setStatus(
          "Catch saved. Use the button below to save or share the stamped photo.",
        );
        return;
      }

      onSaved();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to log the catch.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/45 sm:items-center sm:p-4">
      <section className="max-h-[94vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold">
              Log a catch
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Confirm the time and location. Conditions are frozen with the catch.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
          >
            Close
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
            <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] text-center text-sm text-[var(--muted)]">
              Add a catch photo
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

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm">
            <span className="font-medium">
              Catch time
            </span>
            <input
              type="datetime-local"
              value={caughtAt}
              onChange={(event) =>
                setCaughtAt(
                  event.target.value,
                )
              }
              className="rounded-xl border border-[var(--border)] px-3 py-2.5"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">
              Species
            </span>
            <input
              value={species}
              onChange={(event) =>
                setSpecies(
                  event.target.value,
                )
              }
              placeholder="Striped bass"
              className="rounded-xl border border-[var(--border)] px-3 py-2.5"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">
              Length{" "}
              <span className="font-normal text-[var(--muted)]">
                (in)
              </span>
            </span>
            <input
              inputMode="decimal"
              value={lengthValue}
              onChange={(event) =>
                setLengthValue(
                  event.target.value,
                )
              }
              placeholder="Optional"
              className="rounded-xl border border-[var(--border)] px-3 py-2.5"
            />
          </label>

          <label className="grid gap-1 text-sm">
            <span className="font-medium">
              Weight{" "}
              <span className="font-normal text-[var(--muted)]">
                (lb)
              </span>
            </span>
            <input
              inputMode="decimal"
              value={weightValue}
              onChange={(event) =>
                setWeightValue(
                  event.target.value,
                )
              }
              placeholder="Optional"
              className="rounded-xl border border-[var(--border)] px-3 py-2.5"
            />
          </label>

          <label className="grid gap-1 text-sm sm:col-span-2">
            <span className="font-medium">
              Bait / lure
            </span>
            <input
              value={lureBait}
              onChange={(event) =>
                setLureBait(
                  event.target.value,
                )
              }
              placeholder="Bucktail, clam, topwater..."
              className="rounded-xl border border-[var(--border)] px-3 py-2.5"
            />
          </label>
        </div>

        <section className="mt-5 rounded-2xl border border-[var(--border)] p-4">
          <div>
            <h3 className="font-semibold">
              Catch location
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Defaults to the session location. GPS, map pin, or exact coordinates can override it.
            </p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <LocationModeButton
              active={
                locationMode ===
                "session"
              }
              onClick={
                useSessionLocation
              }
            >
              Session location
            </LocationModeButton>
            <LocationModeButton
              active={
                locationMode === "gps"
              }
              onClick={() =>
                void useCurrentLocation()
              }
            >
              {locationBusy
                ? "Getting GPS…"
                : "Current GPS"}
            </LocationModeButton>
            <LocationModeButton
              active={
                locationMode === "map"
              }
              onClick={() =>
                setLocationMode("map")
              }
            >
              Pick on map
            </LocationModeButton>
            <LocationModeButton
              active={
                locationMode ===
                "manual"
              }
              onClick={() =>
                setLocationMode(
                  "manual",
                )
              }
            >
              Lat / lon
            </LocationModeButton>
          </div>

          <label className="mt-3 grid gap-1 text-sm">
            <span className="font-medium">
              Location name
            </span>
            <input
              value={locationName}
              onChange={(event) =>
                setLocationName(
                  event.target.value,
                )
              }
              placeholder="Optional location label"
              className="rounded-xl border border-[var(--border)] px-3 py-2.5"
            />
          </label>

          {locationMode === "map" ? (
            <div className="mt-3">
              <LocationPickerMap
                latitude={latitude}
                longitude={longitude}
                onChange={(
                  nextLatitude,
                  nextLongitude,
                ) => {
                  setLatitude(
                    nextLatitude,
                  );
                  setLongitude(
                    nextLongitude,
                  );
                }}
              />
            </div>
          ) : null}

          {locationMode ===
          "manual" ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <input
                inputMode="decimal"
                value={
                  Number.isFinite(latitude)
                    ? latitude
                    : ""
                }
                onChange={(event) =>
                  setLatitude(
                    event.target.value.trim()
                      ? Number(
                          event.target.value,
                        )
                      : Number.NaN,
                  )
                }
                className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm"
              />
              <input
                inputMode="decimal"
                value={
                  Number.isFinite(longitude)
                    ? longitude
                    : ""
                }
                onChange={(event) =>
                  setLongitude(
                    event.target.value.trim()
                      ? Number(
                          event.target.value,
                        )
                      : Number.NaN,
                  )
                }
                className="rounded-xl border border-[var(--border)] px-3 py-2.5 text-sm"
              />
            </div>
          ) : null}

          <p className="mt-2 text-xs text-[var(--muted)]">
            {isValidCoordinates(
              latitude,
              longitude,
            )
              ? `${latitude.toFixed(
                  5,
                )}, ${longitude.toFixed(
                  5,
                )}`
              : "Enter valid coordinates"}
            {status ? ` · ${status}` : ""}
          </p>
        </section>

        <section className="mt-5 rounded-2xl border border-[var(--border)] p-4">
          <h3 className="font-semibold">
            Photo stamp
          </h3>
          <p className="mt-1 text-xs text-[var(--muted)]">
            The original photo stays untouched. These fields are appended to a separate shareable copy.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <StampToggle
              label="Date"
              checked={
                stampSettings.showDate
              }
              onChange={(checked) =>
                updateStampSetting(
                  "showDate",
                  checked,
                )
              }
            />
            <StampToggle
              label="Time"
              checked={
                stampSettings.showTime
              }
              onChange={(checked) =>
                updateStampSetting(
                  "showTime",
                  checked,
                )
              }
            />
            <StampToggle
              label="Species"
              checked={
                stampSettings.showSpecies
              }
              onChange={(checked) =>
                updateStampSetting(
                  "showSpecies",
                  checked,
                )
              }
            />
            <StampToggle
              label="Location"
              checked={
                stampSettings.showLocationName
              }
              onChange={(checked) =>
                updateStampSetting(
                  "showLocationName",
                  checked,
                )
              }
            />
            <StampToggle
              label="Lat / lon"
              checked={
                stampSettings.showCoordinates
              }
              onChange={(checked) =>
                updateStampSetting(
                  "showCoordinates",
                  checked,
                )
              }
            />
            <StampToggle
              label="Tide"
              checked={
                stampSettings.showTide
              }
              onChange={(checked) =>
                updateStampSetting(
                  "showTide",
                  checked,
                )
              }
            />
            <StampToggle
              label="Water temp"
              checked={
                stampSettings.showWaterTemperature
              }
              onChange={(checked) =>
                updateStampSetting(
                  "showWaterTemperature",
                  checked,
                )
              }
            />
            <StampToggle
              label="Air temp"
              checked={
                stampSettings.showAirTemperature
              }
              onChange={(checked) =>
                updateStampSetting(
                  "showAirTemperature",
                  checked,
                )
              }
            />
            <StampToggle
              label="Wind"
              checked={
                stampSettings.showWind
              }
              onChange={(checked) =>
                updateStampSetting(
                  "showWind",
                  checked,
                )
              }
            />
            <StampToggle
              label="Moon"
              checked={
                stampSettings.showMoon
              }
              onChange={(checked) =>
                updateStampSetting(
                  "showMoon",
                  checked,
                )
              }
            />
            <StampToggle
              label="Bait / lure"
              checked={
                stampSettings.showLureBait
              }
              onChange={(checked) =>
                updateStampSetting(
                  "showLureBait",
                  checked,
                )
              }
            />
          </div>

          <label className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--surface-muted)] p-3 text-sm">
            <input
              type="checkbox"
              checked={offerDeviceSave}
              onChange={(event) => {
                const checked =
                  event.target.checked;
                setOfferDeviceSave(
                  checked,
                );
                window.localStorage.setItem(
                  DEVICE_SAVE_KEY,
                  checked ? "1" : "0",
                );
              }}
              className="mt-0.5"
            />
            <span>
              After saving, open my device&apos;s share/save menu for the stamped photo.
            </span>
          </label>
        </section>

        <label className="mt-5 grid gap-1 text-sm">
          <span className="font-medium">
            Catch notes
          </span>
          <textarea
            value={notes}
            onChange={(event) =>
              setNotes(
                event.target.value,
              )
            }
            rows={3}
            placeholder="Depth, retrieve, structure, anything worth remembering..."
            className="resize-none rounded-xl border border-[var(--border)] px-3 py-2.5"
          />
        </label>

        {savedStamp && savedFilename ? (
          <section className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <h3 className="font-semibold text-emerald-900">
              Catch saved
            </h3>
            <p className="mt-1 text-sm text-emerald-800">
              The catch and photos are in this session. Use the native share/save menu to put the stamped copy on your device.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  void shareOrDownloadPhoto(
                    savedStamp,
                    savedFilename,
                  ).catch((shareError) => {
                    if (
                      !(
                        shareError instanceof DOMException &&
                        shareError.name === "AbortError"
                      )
                    ) {
                      setError(
                        "The device share/save menu could not be opened.",
                      );
                    }
                  });
                }}
                className="rounded-xl bg-[var(--accent)] px-3 py-2.5 text-sm font-medium text-white"
              >
                Save / Share photo
              </button>
              <button
                type="button"
                onClick={onSaved}
                className="rounded-xl border border-emerald-300 bg-white px-3 py-2.5 text-sm font-medium text-emerald-900"
              >
                Done
              </button>
            </div>
          </section>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {saving && status ? (
          <p className="mt-4 rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--muted)]">
            {status}
          </p>
        ) : null}

        {!savedStamp ? (
          <button
            type="button"
            onClick={() =>
              void handleSave()
            }
            disabled={saving}
            className="mt-5 w-full rounded-xl bg-[var(--accent)] px-4 py-3 font-medium text-white disabled:opacity-60"
          >
            {saving
              ? "Saving catch…"
              : "Save catch"}
          </button>
        ) : null}
      </section>
    </div>
  );
}

function LocationModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-xl border px-3 py-2 text-xs font-medium",
        active
          ? "border-[var(--accent)] bg-[var(--selection)] text-[var(--accent-strong)]"
          : "border-[var(--border)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StampToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange(
            event.target.checked,
          )
        }
      />
      {label}
    </label>
  );
}

function getDeviceLocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracy: number;
}> {
  return new Promise(
    (resolve, reject) => {
      if (!navigator.geolocation) {
        reject(
          new Error(
            "Geolocation is unavailable.",
          ),
        );
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) =>
          resolve({
            latitude:
              position.coords.latitude,
            longitude:
              position.coords.longitude,
            accuracy:
              position.coords.accuracy,
          }),
        reject,
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 15000,
        },
      );
    },
  );
}

function toDatetimeLocalValue(
  date: Date,
): string {
  const local = new Date(
    date.getTime() -
      date.getTimezoneOffset() *
        60_000,
  );

  return local
    .toISOString()
    .slice(0, 16);
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

function isValidCoordinates(
  latitude: number,
  longitude: number,
): boolean {
  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function catchFilename(
  species: string,
  caughtAt: string,
): string {
  const safeSpecies =
    species
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") ||
    "catch";
  const date =
    caughtAt.slice(0, 10);

  return `${safeSpecies}-${date}.jpg`;
}
