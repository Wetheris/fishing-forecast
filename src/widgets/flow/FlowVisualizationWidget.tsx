"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  spot?: {
    latitude: number;
    longitude: number;
  };
  radiusMiles: number;
  density: number;
  speedRangeMph: {
    minimum: number;
    maximum: number;
  };
  source?: {
    id: "noaa-dbofs" | "open-meteo";
    label: string;
    detail: string;
    resolution: string;
  };
  forecast?: Array<{
    validAt: string;
    speedMph: number;
    directionDegrees: number;
  }>;
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

type Camera = {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
};

type ViewportSize = {
  width: number;
  height: number;
};

type MapTile = {
  key: string;
  url: string;
  zoom: number;
  x: number;
  y: number;
  left: number;
  top: number;
};

type PointerDrag = {
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startWorldX: number;
  startWorldY: number;
  startBearing: number;
  moved: boolean;
};

const TILE_SIZE = 256;
const MIN_ZOOM = 4;
const MAX_ZOOM = 16;
const DEFAULT_ZOOM = 10;

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
  const configuredDepth =
    widget.settings.showDepth === true;
  const [showDepth, setShowDepth] =
    useState(configuredDepth);

  const latitude = finiteSetting(
    widget.settings.latitude,
    source.latitude ?? 0,
  );
  const longitude = finiteSetting(
    widget.settings.longitude,
    source.longitude ?? 0,
  );
  const viewLatitude = finiteSetting(
    widget.settings.viewLatitude,
    latitude,
  );
  const viewLongitude = finiteSetting(
    widget.settings.viewLongitude,
    longitude,
  );
  const zoom = clamp(
    finiteSetting(
      widget.settings.zoom,
      DEFAULT_ZOOM,
    ),
    MIN_ZOOM,
    MAX_ZOOM,
  );
  const bearing = normalizeBearing(
    finiteSetting(
      widget.settings.bearing,
      0,
    ),
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
  const showHeader =
    widget.settings.showHeader !== false;
  const compactShell =
    widget.settings.density === "compact";

  /*
   * Tighten the visualization sampling grid as the user zooms in.
   * Modeled ocean currents are spatially coarse, so nearby arrows
   * can legitimately share the same direction/speed at close zoom.
   * Keeping the requested grid tight is still more useful visually
   * than pushing the resolved model cells off-screen.
   */
  const adaptiveRadiusMiles =
    getAdaptiveRadiusMiles(
      radiusMiles,
      zoom,
      mode,
    );

  const [flowState, setFlowState] =
    useState<FlowState>({
      status: "loading",
    });

  useEffect(() => {
    setMode(configuredMode);
  }, [configuredMode]);

  useEffect(() => {
    setShowDepth(configuredDepth);
  }, [configuredDepth]);

  useEffect(() => {
    const controller =
      new AbortController();
    const search =
      new URLSearchParams({
        latitude:
          viewLatitude.toFixed(5),
        longitude:
          viewLongitude.toFixed(5),
        spotLatitude:
          latitude.toFixed(5),
        spotLongitude:
          longitude.toFixed(5),
        mode,
        radiusMiles:
          adaptiveRadiusMiles.toFixed(2),
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
    adaptiveRadiusMiles,
    density,
    latitude,
    longitude,
    mode,
    viewLatitude,
    viewLongitude,
  ]);

  const data =
    flowState.status === "success"
      ? flowState.data
      : null;

  const representativePoint =
    data?.forecast?.[0] ??
    findNearestFlowPoint(
      data?.points ?? [],
      latitude,
      longitude,
    );

  const speedLabel =
    data
      ? mode === "current" &&
        representativePoint
        ? formatCurrentSummary(
            representativePoint.speedMph,
            representativePoint.directionDegrees,
          )
        : formatSpeedRange(
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

  function toggleDepth() {
    const nextDepth =
      !showDepth;
    setShowDepth(nextDepth);

    if (editable) {
      onWidgetSettingsChange?.({
        showDepth: nextDepth,
      });
    }
  }

  return (
    <div
      className={[
        "absolute inset-x-0 bottom-0 overflow-hidden bg-slate-200",
        showHeader
          ? compactShell
            ? "top-9"
            : "top-14"
          : "top-0",
      ].join(" ")}
    >
      <FlowMap
        spotLatitude={latitude}
        spotLongitude={longitude}
        camera={{
          latitude:
            viewLatitude,
          longitude:
            viewLongitude,
          zoom,
          bearing,
        }}
        data={data}
        editable={editable}
        showDepth={showDepth}
        onLocationChange={(
          nextLatitude,
          nextLongitude,
        ) => {
          onWidgetSettingsChange?.({
            latitude:
              nextLatitude,
            longitude:
              nextLongitude,
            viewLatitude:
              nextLatitude,
            viewLongitude:
              nextLongitude,
          });
        }}
        onCameraChange={(
          nextCamera,
        ) => {
          onWidgetSettingsChange?.({
            viewLatitude:
              nextCamera.latitude,
            viewLongitude:
              nextCamera.longitude,
            zoom:
              nextCamera.zoom,
            bearing:
              nextCamera.bearing,
          });
        }}
      />

      <div className="absolute left-2 top-2 z-30 flex items-center gap-1">
        <div className="flex overflow-hidden rounded-xl border border-white/70 bg-white/90 p-1 shadow-sm backdrop-blur">
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

        <button
          type="button"
          aria-pressed={showDepth}
          title="Toggle NOAA BlueTopo depth layer"
          onClick={toggleDepth}
          className={[
            "rounded-xl border border-white/70 px-2.5 py-2 text-[11px] font-medium shadow-sm backdrop-blur transition",
            showDepth
              ? "bg-slate-900 text-white"
              : "bg-white/90 text-slate-700 hover:bg-white",
          ].join(" ")}
        >
          Depth
        </button>
      </div>

      {editable ? (
        <div className="pointer-events-none absolute left-2 top-12 z-20 rounded-lg bg-slate-950/75 px-2 py-1 text-[10px] leading-4 text-white shadow">
          Drag to pan · click to move spot · wheel to zoom
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-2 left-2 z-20 rounded-lg bg-slate-950/75 px-2 py-1 text-[10px] text-white shadow">
        {flowState.status === "loading"
          ? "Loading flow…"
          : flowState.status ===
              "error"
            ? "Flow unavailable"
            : speedLabel}
      </div>

      {mode === "wind" ? (
        <div className="pointer-events-none absolute bottom-2 right-2 z-20 rounded-lg bg-white/90 px-2 py-1 text-[10px] text-slate-700 shadow">
          Arrows show movement
        </div>
      ) : data?.source ? (
        <div
          className="pointer-events-none absolute bottom-2 right-2 z-20 rounded-lg bg-white/90 px-2 py-1 text-[10px] text-slate-700 shadow"
          title={`${data.source.detail} · ${data.source.resolution}`}
        >
          {data.source.id ===
          "open-meteo" &&
          mode === "current"
            ? "Open-Meteo · regional"
            : data.source.label}
        </div>
      ) : null}

      {flowState.status === "error" ? (
        <div className="pointer-events-none absolute inset-x-3 top-1/2 z-20 -translate-y-1/2 rounded-xl bg-white/95 p-3 text-center text-xs text-red-700 shadow">
          {flowState.error}
        </div>
      ) : null}
    </div>
  );
}

function FlowMap({
  spotLatitude,
  spotLongitude,
  camera,
  data,
  editable,
  showDepth,
  onLocationChange,
  onCameraChange,
}: {
  spotLatitude: number;
  spotLongitude: number;
  camera: Camera;
  data: FlowFieldData | null;
  editable: boolean;
  showDepth: boolean;
  onLocationChange: (
    latitude: number,
    longitude: number,
  ) => void;
  onCameraChange: (
    camera: Camera,
  ) => void;
}) {
  const viewportRef =
    useRef<HTMLDivElement>(null);
  const pointerRef =
    useRef<PointerDrag | null>(
      null,
    );
  const cameraRef =
    useRef<Camera>(camera);
  const [localCamera, setLocalCamera] =
    useState<Camera>(camera);
  const [viewportSize, setViewportSize] =
    useState<ViewportSize>({
      width: 640,
      height: 360,
    });

  function updateLocalCamera(
    nextCamera: Camera,
  ) {
    cameraRef.current =
      nextCamera;
    setLocalCamera(
      nextCamera,
    );
  }

  useEffect(() => {
    const nextCamera = {
      latitude:
        clamp(
          camera.latitude,
          -85.05112878,
          85.05112878,
        ),
      longitude:
        wrapLongitude(
          camera.longitude,
        ),
      zoom:
        Math.round(
          clamp(
            camera.zoom,
            MIN_ZOOM,
            MAX_ZOOM,
          ),
        ),
      bearing:
        normalizeBearing(
          camera.bearing,
        ),
    };

    const current =
      cameraRef.current;

    if (
      cameraAlmostEqual(
        current,
        nextCamera,
      )
    ) {
      return;
    }

    updateLocalCamera(
      nextCamera,
    );
  }, [
    camera.bearing,
    camera.latitude,
    camera.longitude,
    camera.zoom,
  ]);

  useEffect(() => {
    const viewport =
      viewportRef.current;

    if (!viewport) {
      return;
    }

    const observer =
      new ResizeObserver(
        (entries) => {
          const entry =
            entries[0];
          if (!entry) {
            return;
          }

          setViewportSize({
            width: Math.max(
              1,
              entry.contentRect.width,
            ),
            height: Math.max(
              1,
              entry.contentRect.height,
            ),
          });
        },
      );

    observer.observe(
      viewport,
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  const centerWorld =
    useMemo(
      () =>
        lngLatToWorld(
          localCamera.longitude,
          localCamera.latitude,
          localCamera.zoom,
        ),
      [
        localCamera.latitude,
        localCamera.longitude,
        localCamera.zoom,
      ],
    );

  const tiles =
    useMemo(
      () =>
        buildVisibleTiles(
          centerWorld.x,
          centerWorld.y,
          localCamera.zoom,
          viewportSize,
        ),
      [
        centerWorld.x,
        centerWorld.y,
        localCamera.zoom,
        viewportSize,
      ],
    );

  const spotPosition =
    useMemo(
      () =>
        projectToViewport(
          spotLongitude,
          spotLatitude,
          localCamera.zoom,
          centerWorld,
          viewportSize,
        ),
      [
        centerWorld,
        localCamera.zoom,
        spotLatitude,
        spotLongitude,
        viewportSize,
      ],
    );

  const projectedFlowPoints =
    useMemo(
      () =>
        (data?.points ?? []).map(
          (point) => ({
            ...point,
            position:
              projectToViewport(
                point.longitude,
                point.latitude,
                localCamera.zoom,
                centerWorld,
                viewportSize,
              ),
          }),
        ),
      [
        centerWorld,
        data,
        localCamera.zoom,
        viewportSize,
      ],
    );

  const maximumSpeed =
    useMemo(
      () =>
        Math.max(
          0.01,
          ...(data?.points ?? []).map(
            (point) =>
              point.speedMph,
          ),
        ),
      [data],
    );

  function commitCamera(
    nextCamera: Camera =
      cameraRef.current,
  ) {
    const normalized = {
      latitude:
        clamp(
          nextCamera.latitude,
          -85.05112878,
          85.05112878,
        ),
      longitude:
        wrapLongitude(
          nextCamera.longitude,
        ),
      zoom:
        Math.round(
          clamp(
            nextCamera.zoom,
            MIN_ZOOM,
            MAX_ZOOM,
          ),
        ),
      bearing:
        normalizeBearing(
          nextCamera.bearing,
        ),
    };

    updateLocalCamera(
      normalized,
    );

    if (editable) {
      onCameraChange(
        normalized,
      );
    }
  }

  function changeZoom(
    delta: number,
  ) {
    const current =
      cameraRef.current;
    const nextZoom =
      Math.round(
        clamp(
          current.zoom + delta,
          MIN_ZOOM,
          MAX_ZOOM,
        ),
      );

    if (
      nextZoom ===
      current.zoom
    ) {
      return;
    }

    commitCamera({
      ...current,
      zoom: nextZoom,
    });
  }

  function changeBearing(
    delta: number,
  ) {
    const current =
      cameraRef.current;

    commitCamera({
      ...current,
      bearing:
        normalizeBearing(
          current.bearing +
            delta,
        ),
    });
  }

  function resetNorth() {
    const current =
      cameraRef.current;

    if (
      Math.abs(
        current.bearing,
      ) < 0.01
    ) {
      return;
    }

    commitCamera({
      ...current,
      bearing: 0,
    });
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    if (!editable) {
      return;
    }

    const current =
      cameraRef.current;
    const world =
      lngLatToWorld(
        current.longitude,
        current.latitude,
        current.zoom,
      );

    pointerRef.current = {
      pointerId:
        event.pointerId,
      startClientX:
        event.clientX,
      startClientY:
        event.clientY,
      startWorldX:
        world.x,
      startWorldY:
        world.y,
      startBearing:
        current.bearing,
      moved: false,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );
  }

  function handlePointerMove(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const drag =
      pointerRef.current;

    if (
      !editable ||
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    const screenDx =
      event.clientX -
      drag.startClientX;
    const screenDy =
      event.clientY -
      drag.startClientY;

    if (
      Math.hypot(
        screenDx,
        screenDy,
      ) > 4
    ) {
      drag.moved = true;
    }

    const localDelta =
      rotateVector(
        screenDx,
        screenDy,
        drag.startBearing,
      );
    const zoom =
      cameraRef.current.zoom;
    const worldSize =
      worldSizeAtZoom(zoom);

    const nextWorldX =
      wrapWorldX(
        drag.startWorldX -
          localDelta.x,
        worldSize,
      );
    const nextWorldY =
      clamp(
        drag.startWorldY -
          localDelta.y,
        0,
        worldSize,
      );
    const nextPosition =
      worldToLngLat(
        nextWorldX,
        nextWorldY,
        zoom,
      );

    updateLocalCamera({
      ...cameraRef.current,
      latitude:
        nextPosition.latitude,
      longitude:
        nextPosition.longitude,
    });
  }

  function finishPointer(
    event: React.PointerEvent<HTMLDivElement>,
  ) {
    const drag =
      pointerRef.current;

    if (
      !drag ||
      drag.pointerId !==
        event.pointerId
    ) {
      return;
    }

    pointerRef.current =
      null;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId,
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    }

    if (!editable) {
      return;
    }

    if (drag.moved) {
      commitCamera();
      return;
    }

    const rect =
      event.currentTarget.getBoundingClientRect();
    const selected =
      screenPointToLngLat(
        event.clientX -
          rect.left,
        event.clientY -
          rect.top,
        cameraRef.current,
        {
          width: rect.width,
          height:
            rect.height,
        },
      );

    updateLocalCamera({
      ...cameraRef.current,
      latitude:
        selected.latitude,
      longitude:
        selected.longitude,
    });

    onLocationChange(
      selected.latitude,
      selected.longitude,
    );
  }

  return (
    <>
      <div
        ref={viewportRef}
        className={[
          "absolute inset-0 overflow-hidden bg-slate-200",
          editable
            ? "cursor-grab active:cursor-grabbing"
            : "cursor-default",
        ].join(" ")}
        style={{
          touchAction:
            editable
              ? "none"
              : "auto",
        }}
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          finishPointer
        }
        onPointerCancel={(
          event,
        ) => {
          if (
            pointerRef.current?.pointerId ===
            event.pointerId
          ) {
            pointerRef.current =
              null;
          }
        }}
        onWheel={(event) => {
          if (!editable) {
            return;
          }

          event.preventDefault();

          if (
            Math.abs(
              event.deltaY,
            ) < 1
          ) {
            return;
          }

          changeZoom(
            event.deltaY < 0
              ? 1
              : -1,
          );
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            transform:
              `rotate(${-localCamera.bearing}deg)`,
            transformOrigin:
              "50% 50%",
          }}
        >
          {tiles.map(
            (tile) => (
              <img
                key={tile.key}
                src={tile.url}
                alt=""
                draggable={false}
                className="pointer-events-none absolute select-none"
                style={{
                  width:
                    TILE_SIZE,
                  height:
                    TILE_SIZE,
                  left:
                    tile.left,
                  top:
                    tile.top,
                  maxWidth:
                    "none",
                }}
              />
            ),
          )}

          {showDepth
            ? tiles.map(
                (tile) => (
                  <img
                    key={`depth:${tile.key}`}
                    src={buildBlueTopoTileUrl(
                      tile.zoom,
                      tile.x,
                      tile.y,
                      "bluetopo:bathymetry",
                    )}
                    alt=""
                    draggable={false}
                    data-depth-fallback="0"
                    onError={(event) => {
                      const image =
                        event.currentTarget;

                      if (
                        image.dataset
                          .depthFallback ===
                        "0"
                      ) {
                        image.dataset.depthFallback =
                          "1";
                        image.src =
                          buildBlueTopoTileUrl(
                            tile.zoom,
                            tile.x,
                            tile.y,
                            "bluetopo:elevation",
                          );
                        return;
                      }

                      image.style.display =
                        "none";
                    }}
                    className="pointer-events-none absolute select-none"
                    style={{
                      width:
                        TILE_SIZE,
                      height:
                        TILE_SIZE,
                      left:
                        tile.left,
                      top:
                        tile.top,
                      maxWidth:
                        "none",
                      opacity: 0.72,
                    }}
                  />
                ),
              )
            : null}

          {projectedFlowPoints.map(
            (point) => {
              const ratio =
                clamp(
                  point.speedMph /
                    maximumSpeed,
                  0,
                  1,
                );
              const size =
                18 +
                ratio * 12;
              const opacity =
                0.55 +
                ratio * 0.4;

              return (
                <div
                  key={[
                    point.latitude.toFixed(
                      5,
                    ),
                    point.longitude.toFixed(
                      5,
                    ),
                  ].join(":")}
                  className="pointer-events-none absolute flex items-center justify-center font-extrabold text-[#087f8c]"
                  style={{
                    left:
                      point.position.x,
                    top:
                      point.position.y,
                    width: size,
                    height: size,
                    fontSize: size,
                    lineHeight: 1,
                    opacity,
                    textShadow:
                      "0 1px 2px rgba(255,255,255,.95)",
                    transform:
                      `translate(-50%, -50%) rotate(${point.directionDegrees}deg)`,
                    transformOrigin:
                      "center",
                  }}
                >
                  ↑
                </div>
              );
            },
          )}

          <div
            className="pointer-events-none absolute h-3 w-3 rounded-full border-2 border-white bg-[#087f8c] shadow"
            style={{
              left:
                spotPosition.x,
              top:
                spotPosition.y,
              transform:
                "translate(-50%, -50%)",
            }}
          />
        </div>
      </div>

      {editable ? (
        <div className="absolute right-2 top-2 z-30 overflow-hidden rounded-xl border border-white/70 bg-white/90 shadow-sm backdrop-blur">
          <div className="flex border-b border-slate-200">
            <MapControlButton
              label="Zoom in"
              onClick={() =>
                changeZoom(1)
              }
            >
              +
            </MapControlButton>
            <MapControlButton
              label="Zoom out"
              onClick={() =>
                changeZoom(-1)
              }
            >
              −
            </MapControlButton>
          </div>
          <div className="flex">
            <MapControlButton
              label="Rotate left"
              onClick={() =>
                changeBearing(
                  -15,
                )
              }
            >
              ↶
            </MapControlButton>
            <MapControlButton
              label="Reset north"
              onClick={
                resetNorth
              }
            >
              N
            </MapControlButton>
            <MapControlButton
              label="Rotate right"
              onClick={() =>
                changeBearing(
                  15,
                )
              }
            >
              ↷
            </MapControlButton>
          </div>
        </div>
      ) : null}

      {editable ? (
        <div className="pointer-events-none absolute right-2 top-[82px] z-20 rounded-lg bg-white/90 px-2 py-1 text-[10px] tabular-nums text-slate-700 shadow">
          Z{localCamera.zoom} ·{" "}
          {formatBearing(
            localCamera.bearing,
          )}
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-0 right-0 z-10 bg-white/75 px-1.5 py-0.5 text-[8px] text-slate-600">
        © OpenStreetMap
        {showDepth
          ? " · NOAA BlueTopo"
          : ""}
      </div>
    </>
  );
}

function MapControlButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex h-8 min-w-8 items-center justify-center border-r border-slate-200 px-2 text-sm font-semibold text-slate-700 last:border-r-0 hover:bg-slate-100"
    >
      {children}
    </button>
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

function buildVisibleTiles(
  centerX: number,
  centerY: number,
  zoom: number,
  viewport: ViewportSize,
): MapTile[] {
  const tileCount =
    2 ** zoom;
  const centerTileX =
    Math.floor(
      centerX / TILE_SIZE,
    );
  const centerTileY =
    Math.floor(
      centerY / TILE_SIZE,
    );
  const diagonal =
    Math.hypot(
      viewport.width,
      viewport.height,
    );
  const tileRadius =
    Math.min(
      7,
      Math.ceil(
        diagonal /
          (2 * TILE_SIZE),
      ) + 2,
    );

  const tiles: MapTile[] =
    [];

  for (
    let yOffset =
      -tileRadius;
    yOffset <=
    tileRadius;
    yOffset += 1
  ) {
    const rawY =
      centerTileY +
      yOffset;

    if (
      rawY < 0 ||
      rawY >= tileCount
    ) {
      continue;
    }

    for (
      let xOffset =
        -tileRadius;
      xOffset <=
      tileRadius;
      xOffset += 1
    ) {
      const rawX =
        centerTileX +
        xOffset;
      const wrappedX =
        modulo(
          rawX,
          tileCount,
        );

      tiles.push({
        key:
          `${zoom}:${rawX}:${rawY}`,
        url:
          `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${rawY}.png`,
        zoom,
        x: wrappedX,
        y: rawY,
        left:
          rawX *
            TILE_SIZE -
          centerX +
          viewport.width /
            2,
        top:
          rawY *
            TILE_SIZE -
          centerY +
          viewport.height /
            2,
      });
    }
  }

  return tiles;
}

function projectToViewport(
  longitude: number,
  latitude: number,
  zoom: number,
  centerWorld: {
    x: number;
    y: number;
  },
  viewport: ViewportSize,
): {
  x: number;
  y: number;
} {
  const point =
    lngLatToWorld(
      longitude,
      latitude,
      zoom,
    );
  const worldSize =
    worldSizeAtZoom(
      zoom,
    );
  let deltaX =
    point.x -
    centerWorld.x;

  if (
    deltaX >
    worldSize / 2
  ) {
    deltaX -=
      worldSize;
  } else if (
    deltaX <
    -worldSize / 2
  ) {
    deltaX +=
      worldSize;
  }

  return {
    x:
      viewport.width /
        2 +
      deltaX,
    y:
      viewport.height /
        2 +
      point.y -
      centerWorld.y,
  };
}

function screenPointToLngLat(
  screenX: number,
  screenY: number,
  camera: Camera,
  viewport: ViewportSize,
): {
  latitude: number;
  longitude: number;
} {
  const screenDelta = {
    x:
      screenX -
      viewport.width / 2,
    y:
      screenY -
      viewport.height / 2,
  };
  const localDelta =
    rotateVector(
      screenDelta.x,
      screenDelta.y,
      camera.bearing,
    );
  const center =
    lngLatToWorld(
      camera.longitude,
      camera.latitude,
      camera.zoom,
    );
  const worldSize =
    worldSizeAtZoom(
      camera.zoom,
    );

  return worldToLngLat(
    wrapWorldX(
      center.x +
        localDelta.x,
      worldSize,
    ),
    clamp(
      center.y +
        localDelta.y,
      0,
      worldSize,
    ),
    camera.zoom,
  );
}

function rotateVector(
  x: number,
  y: number,
  degrees: number,
): {
  x: number;
  y: number;
} {
  const radians =
    degrees *
    (Math.PI / 180);
  const cosine =
    Math.cos(radians);
  const sine =
    Math.sin(radians);

  return {
    x:
      x * cosine -
      y * sine,
    y:
      x * sine +
      y * cosine,
  };
}

function buildBlueTopoTileUrl(
  zoom: number,
  x: number,
  y: number,
  layer: string,
): string {
  /*
   * nowCOAST publishes BlueTopo through standard OGC web map
   * services. Asking for the same 256px Web-Mercator footprint as
   * each OSM tile lets the bathymetry sit directly under TideHawk's
   * arrows without introducing another map library.
   */
  const earthRadius =
    6378137;
  const originShift =
    Math.PI * earthRadius;
  const tileSpan =
    (2 * originShift) /
    2 ** zoom;

  const minimumX =
    -originShift +
    x * tileSpan;
  const maximumX =
    minimumX +
    tileSpan;
  const maximumY =
    originShift -
    y * tileSpan;
  const minimumY =
    maximumY -
    tileSpan;

  const search =
    new URLSearchParams({
      SERVICE: "WMS",
      VERSION: "1.1.1",
      REQUEST: "GetMap",
      LAYERS: layer,
      STYLES: "",
      SRS: "EPSG:3857",
      BBOX: [
        minimumX,
        minimumY,
        maximumX,
        maximumY,
      ].join(","),
      WIDTH:
        TILE_SIZE.toString(),
      HEIGHT:
        TILE_SIZE.toString(),
      FORMAT: "image/png",
      TRANSPARENT: "true",
    });

  return `https://nowcoast.noaa.gov/geoserver/ows?${search.toString()}`;
}

function lngLatToWorld(
  longitude: number,
  latitude: number,
  zoom: number,
): {
  x: number;
  y: number;
} {
  const size =
    worldSizeAtZoom(
      zoom,
    );
  const clampedLatitude =
    clamp(
      latitude,
      -85.05112878,
      85.05112878,
    );
  const latitudeRadians =
    clampedLatitude *
    (Math.PI / 180);
  const x =
    ((wrapLongitude(
      longitude,
    ) +
      180) /
      360) *
    size;
  const y =
    (1 -
      Math.log(
        Math.tan(
          latitudeRadians,
        ) +
          1 /
            Math.cos(
              latitudeRadians,
            ),
      ) /
        Math.PI) /
    2 *
    size;

  return { x, y };
}

function worldToLngLat(
  x: number,
  y: number,
  zoom: number,
): {
  latitude: number;
  longitude: number;
} {
  const size =
    worldSizeAtZoom(
      zoom,
    );
  const longitude =
    (x / size) *
      360 -
    180;
  const mercatorY =
    Math.PI *
    (1 -
      2 *
        (y / size));
  const latitude =
    (180 / Math.PI) *
    Math.atan(
      Math.sinh(
        mercatorY,
      ),
    );

  return {
    latitude:
      clamp(
        latitude,
        -85.05112878,
        85.05112878,
      ),
    longitude:
      wrapLongitude(
        longitude,
      ),
  };
}

function worldSizeAtZoom(
  zoom: number,
): number {
  return (
    TILE_SIZE *
    2 ** zoom
  );
}

function wrapWorldX(
  value: number,
  worldSize: number,
): number {
  return modulo(
    value,
    worldSize,
  );
}

function modulo(
  value: number,
  divisor: number,
): number {
  return (
    ((value % divisor) +
      divisor) %
    divisor
  );
}

function cameraAlmostEqual(
  first: Camera,
  second: Camera,
): boolean {
  return (
    Math.abs(
      first.latitude -
        second.latitude,
    ) < 0.000001 &&
    Math.abs(
      first.longitude -
        second.longitude,
    ) < 0.000001 &&
    first.zoom ===
      second.zoom &&
    Math.abs(
      first.bearing -
        second.bearing,
    ) < 0.001
  );
}

function getAdaptiveRadiusMiles(
  maximumRadiusMiles: number,
  zoom: number,
  mode: FlowMode,
): number {
  const scaled =
    (maximumRadiusMiles * 1.6) /
    2 **
      Math.max(
        0,
        zoom - 8,
      );
  const minimum =
    mode === "current"
      ? 0.75
      : 0.75;

  return clamp(
    scaled,
    minimum,
    maximumRadiusMiles,
  );
}

function formatBearing(
  bearing: number,
): string {
  const normalized =
    ((bearing % 360) +
      360) %
    360;

  if (
    normalized < 0.5 ||
    normalized > 359.5
  ) {
    return "N";
  }

  return `${Math.round(
    normalized,
  )}°`;
}

function findNearestFlowPoint(
  points: FlowPoint[],
  latitude: number,
  longitude: number,
): FlowPoint | undefined {
  let nearest:
    FlowPoint | undefined;
  let nearestDistance =
    Number.POSITIVE_INFINITY;

  for (const point of points) {
    const latitudeDelta =
      point.latitude - latitude;
    const longitudeDelta =
      (point.longitude - longitude) *
      Math.cos(
        latitude *
          (Math.PI / 180),
      );
    const distance =
      latitudeDelta *
        latitudeDelta +
      longitudeDelta *
        longitudeDelta;

    if (distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function formatCurrentSummary(
  speedMph: number,
  directionDegrees: number,
): string {
  const direction =
    ((directionDegrees % 360) +
      360) %
    360;

  return `At spot · ${speedMph.toFixed(
    1,
  )} mph · ${Math.round(
    direction,
  )}° ${formatCompassDirection(
    direction,
  )}`;
}

function formatCompassDirection(
  directionDegrees: number,
): string {
  const directions = [
    "N",
    "NNE",
    "NE",
    "ENE",
    "E",
    "ESE",
    "SE",
    "SSE",
    "S",
    "SSW",
    "SW",
    "WSW",
    "W",
    "WNW",
    "NW",
    "NNW",
  ] as const;
  const index =
    Math.round(
      directionDegrees /
        22.5,
    ) %
    directions.length;

  return (
    directions[index] ??
    "N"
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

function normalizeBearing(
  value: number,
): number {
  const normalized =
    ((value + 180) %
      360 +
      360) %
      360 -
    180;

  return Math.abs(
    normalized,
  ) < 0.0001
    ? 0
    : normalized;
}

function wrapLongitude(
  value: number,
): number {
  return (
    ((value + 180) %
      360 +
      360) %
      360 -
    180
  );
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
