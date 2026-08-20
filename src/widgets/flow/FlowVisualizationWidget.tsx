"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Map as LeafletMap,
  Layer,
} from "leaflet";
import type {
  WidgetComponentProps,
} from "@/widgets/types";

type FlowMode = "wind" | "current";

type FlowPoint = {
  latitude: number;
  longitude: number;
  speedMph: number;
  directionDegrees: number;
};

type FlowFieldData = {
  mode: FlowMode;
  fetchedAt: string;
  center: {
    latitude: number;
    longitude: number;
  };
  radiusMiles: number;
  density: number;
  speedRangeMph: {
    minimum: number;
    maximum: number;
  };
  points: FlowPoint[];
};

type FlowState =
  | { status: "loading" }
  | {
      status: "success";
      data: FlowFieldData;
    }
  | {
      status: "error";
      error: string;
    };

export function FlowVisualizationWidget({
  widget,
  source,
  onWidgetSettingsChange,
}: WidgetComponentProps) {
  const configuredMode =
    widget.settings.mode === "current"
      ? "current"
      : "wind";
  const [mode, setMode] =
    useState<FlowMode>(
      configuredMode,
    );

  const latitude = finiteSetting(
    widget.settings.latitude,
    source.latitude ?? 0,
  );
  const longitude = finiteSetting(
    widget.settings.longitude,
    source.longitude ?? 0,
  );
  const radiusMiles = clamp(
    finiteSetting(
      widget.settings.radiusMiles,
      20,
    ),
    5,
    60,
  );
  const density = normalizeDensity(
    finiteSetting(
      widget.settings.density,
      5,
    ),
  );
  const editable =
    typeof onWidgetSettingsChange ===
    "function";

  const [flowState, setFlowState] =
    useState<FlowState>({
      status: "loading",
    });

  useEffect(() => {
    setMode(configuredMode);
  }, [configuredMode]);

  useEffect(() => {
    const controller =
      new AbortController();
    const search =
      new URLSearchParams({
        latitude:
          latitude.toFixed(5),
        longitude:
          longitude.toFixed(5),
        mode,
        radiusMiles:
          radiusMiles.toString(),
        density:
          density.toString(),
      });

    setFlowState({
      status: "loading",
    });

    void fetch(
      `/api/flow-field?${search}`,
      {
        cache: "no-store",
        signal:
          controller.signal,
      },
    )
      .then(async (response) => {
        const body =
          (await response.json()) as
            | FlowFieldData
            | { error?: string };

        if (!response.ok) {
          throw new Error(
            "error" in body &&
            body.error
              ? body.error
              : "Unable to load visualization data.",
          );
        }

        setFlowState({
          status: "success",
          data:
            body as FlowFieldData,
        });
      })
      .catch((error: unknown) => {
        if (
          error instanceof DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        setFlowState({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Unable to load visualization data.",
        });
      });

    return () => {
      controller.abort();
    };
  }, [
    density,
    latitude,
    longitude,
    mode,
    radiusMiles,
  ]);

  const data =
    flowState.status === "success"
      ? flowState.data
      : null;

  const speedLabel =
    data
      ? formatSpeedRange(
          data.speedRangeMph.minimum,
          data.speedRangeMph.maximum,
          mode,
        )
      : mode === "wind"
        ? "Wind flow"
        : "Modeled tide/current flow";

  function changeMode(
    nextMode: FlowMode,
  ) {
    setMode(nextMode);

    if (editable) {
      onWidgetSettingsChange?.({
        mode: nextMode,
      });
    }
  }

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden rounded-xl bg-slate-200">
      <FlowMap
        latitude={latitude}
        longitude={longitude}
        radiusMiles={radiusMiles}
        data={data}
        editable={editable}
        onLocationChange={(
          nextLatitude,
          nextLongitude,
        ) => {
          onWidgetSettingsChange?.({
            latitude:
              nextLatitude,
            longitude:
              nextLongitude,
          });
        }}
      />

      <div className="absolute left-2 top-2 z-[500] flex overflow-hidden rounded-xl border border-white/70 bg-white/90 p-1 shadow-sm backdrop-blur">
        <ModeButton
          active={mode === "wind"}
          onClick={() =>
            changeMode("wind")
          }
        >
          Wind
        </ModeButton>
        <ModeButton
          active={mode === "current"}
          onClick={() =>
            changeMode("current")
          }
        >
          Tide flow
        </ModeButton>
      </div>

      {editable ? (
        <div className="pointer-events-none absolute right-2 top-2 z-[500] max-w-[150px] rounded-lg bg-slate-950/75 px-2 py-1 text-right text-[10px] leading-4 text-white shadow">
          Tap the map to set the visualization center
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-2 left-2 z-[500] rounded-lg bg-slate-950/75 px-2 py-1 text-[10px] text-white shadow">
        {flowState.status === "loading"
          ? "Loading flow…"
          : flowState.status ===
              "error"
            ? "Flow unavailable"
            : speedLabel}
      </div>

      <div className="pointer-events-none absolute bottom-2 right-2 z-[500] rounded-lg bg-white/90 px-2 py-1 text-[10px] text-slate-700 shadow">
        {mode === "wind"
          ? "Arrows show movement"
          : "Modeled current · not for navigation"}
      </div>

      {flowState.status === "error" ? (
        <div className="pointer-events-none absolute inset-x-3 top-1/2 z-[500] -translate-y-1/2 rounded-xl bg-white/95 p-3 text-center text-xs text-red-700 shadow">
          {flowState.error}
        </div>
      ) : null}
    </div>
  );
}

function FlowMap({
  latitude,
  longitude,
  radiusMiles,
  data,
  editable,
  onLocationChange,
}: {
  latitude: number;
  longitude: number;
  radiusMiles: number;
  data: FlowFieldData | null;
  editable: boolean;
  onLocationChange: (
    latitude: number,
    longitude: number,
  ) => void;
}) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const zoom = useMemo(
    () =>
      radiusMiles <= 8
        ? 10
        : radiusMiles <= 15
          ? 9
          : radiusMiles <= 30
            ? 8
            : 7,
    [radiusMiles],
  );

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    let disposed = false;
    let map: LeafletMap | null =
      null;
    let resizeObserver:
      | ResizeObserver
      | null = null;
    const arrowLayers: Layer[] = [];

    async function initialize() {
      const L =
        await import("leaflet");

      if (
        disposed ||
        !containerRef.current
      ) {
        return;
      }

      map = L.map(
        containerRef.current,
        {
          center: [
            latitude,
            longitude,
          ],
          zoom,
          minZoom: 4,
          maxZoom: 13,
          zoomControl: false,
          attributionControl: true,
          dragging: true,
          touchZoom: true,
          doubleClickZoom: true,
          scrollWheelZoom: false,
          boxZoom: false,
          keyboard: false,
        },
      );

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          minZoom: 4,
          maxZoom: 13,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        },
      ).addTo(map);

      L.circleMarker(
        [latitude, longitude],
        {
          radius: 5,
          color: "#ffffff",
          weight: 2,
          fillColor: "#087f8c",
          fillOpacity: 1,
        },
      ).addTo(map);

      if (data) {
        const maxSpeed =
          Math.max(
            0.01,
            ...data.points.map(
              (point) =>
                point.speedMph,
            ),
          );

        data.points.forEach(
          (point) => {
            const ratio =
              clamp(
                point.speedMph /
                  maxSpeed,
                0,
                1,
              );
            const size =
              18 +
              ratio * 12;
            const opacity =
              0.55 +
              ratio * 0.4;

            const icon =
              L.divIcon({
                className:
                  "tidehawk-flow-arrow",
                iconSize: [
                  size,
                  size,
                ],
                iconAnchor: [
                  size / 2,
                  size / 2,
                ],
                html:
                  `<div style="` +
                  `width:${size}px;` +
                  `height:${size}px;` +
                  `display:flex;` +
                  `align-items:center;` +
                  `justify-content:center;` +
                  `font-size:${size}px;` +
                  `line-height:1;` +
                  `font-weight:800;` +
                  `color:#087f8c;` +
                  `opacity:${opacity};` +
                  `text-shadow:0 1px 2px rgba(255,255,255,.95);` +
                  `transform:rotate(${point.directionDegrees}deg);` +
                  `transform-origin:center;` +
                  `">↑</div>`,
              });

            const marker =
              L.marker(
                [
                  point.latitude,
                  point.longitude,
                ],
                {
                  icon,
                  interactive: false,
                  keyboard: false,
                },
              ).addTo(map as LeafletMap);

            arrowLayers.push(
              marker,
            );
          },
        );
      }

      if (editable) {
        map.on(
          "click",
          (event) => {
            onLocationChange(
              event.latlng.lat,
              event.latlng.lng,
            );
          },
        );
      }

      resizeObserver =
        new ResizeObserver(() => {
          map?.invalidateSize({
            pan: false,
            debounceMoveend: true,
          });
        });
      resizeObserver.observe(
        containerRef.current,
      );

      window.setTimeout(() => {
        map?.invalidateSize({
          pan: false,
        });
      }, 0);
    }

    void initialize();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      arrowLayers.forEach(
        (layer) =>
          layer.remove(),
      );
      map?.remove();
    };
  }, [
    data,
    editable,
    latitude,
    longitude,
    onLocationChange,
    zoom,
  ]);

  return (
    <div
      ref={containerRef}
      className="h-full min-h-40 w-full"
    />
  );
}

function ModeButton({
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
        "rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition",
        active
          ? "bg-[var(--accent)] text-white"
          : "text-slate-600 hover:bg-slate-100",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function formatSpeedRange(
  minimum: number,
  maximum: number,
  mode: FlowMode,
): string {
  const decimals =
    mode === "current"
      ? 1
      : 0;
  const minimumText =
    minimum.toFixed(decimals);
  const maximumText =
    maximum.toFixed(decimals);

  if (
    Math.abs(
      maximum - minimum,
    ) < (mode === "current"
      ? 0.05
      : 0.5)
  ) {
    return `${
      mode === "wind"
        ? "Wind"
        : "Tide/current"
    } · ${maximumText} mph`;
  }

  return `${
    mode === "wind"
      ? "Wind"
      : "Tide/current"
  } · ${minimumText}–${maximumText} mph`;
}

function finiteSetting(
  value: unknown,
  fallback: number,
): number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  )
    ? value
    : fallback;
}

function normalizeDensity(
  value: number,
): number {
  const rounded =
    Math.round(
      clamp(value, 3, 7),
    );

  if (rounded % 2 === 1) {
    return rounded;
  }

  return rounded >= 6
    ? 7
    : rounded <= 4
      ? 3
      : 5;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(minimum, value),
  );
}
