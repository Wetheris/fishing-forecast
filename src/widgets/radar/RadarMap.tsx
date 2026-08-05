"use client";

import { useEffect, useRef } from "react";
import type {
  Map as LeafletMap,
  TileLayer,
} from "leaflet";
import type {
  DashboardSource,
} from "@/types/dashboard";
import type {
  RadarSourceData,
} from "@/types/source-data";

export function RadarMap({
  source,
  data,
  zoom,
  opacity,
  animate,
  frameDurationMs,
  showLocationMarker,
}: {
  source: DashboardSource;
  data: RadarSourceData;
  zoom: number;
  opacity: number;
  animate: boolean;
  frameDurationMs: number;
  showLocationMarker: boolean;
}) {
  const containerRef =
    useRef<HTMLDivElement>(null);
  const timeLabelRef =
    useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (
      !container ||
      typeof source.latitude !== "number" ||
      typeof source.longitude !== "number"
    ) {
      return;
    }

    let disposed = false;
    let map: LeafletMap | null = null;
    let radarLayer: TileLayer | null = null;
    let intervalId: number | null = null;
    let resizeObserver: ResizeObserver | null =
      null;

    async function initialize() {
      const L = await import("leaflet");

      if (disposed || !containerRef.current) {
        return;
      }

      map = L.map(containerRef.current, {
        center: [
          source.latitude as number,
          source.longitude as number,
        ],
        zoom,
        minZoom: 3,
        maxZoom: 7,
        zoomControl: false,
        attributionControl: true,
        dragging: false,
        touchZoom: false,
        doubleClickZoom: false,
        scrollWheelZoom: false,
        boxZoom: false,
        keyboard: false,
      });

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          minZoom: 3,
          maxZoom: 7,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        },
      ).addTo(map);

      if (showLocationMarker) {
        L.circleMarker(
          [
            source.latitude as number,
            source.longitude as number,
          ],
          {
            radius: 6,
            color: "#ffffff",
            weight: 3,
            fillColor: "#087f8c",
            fillOpacity: 1,
          },
        ).addTo(map);
      }

      const frames = animate
        ? data.frames
        : [data.frames.at(-1)].filter(
            (
              frame,
            ): frame is RadarSourceData["frames"][number] =>
              frame !== undefined,
          );

      let currentIndex = animate
        ? 0
        : Math.max(0, frames.length - 1);

      const showFrame = (index: number) => {
        if (!map || frames.length === 0) {
          return;
        }

        radarLayer?.remove();

        const frame = frames[index];

        radarLayer = L.tileLayer(
          `${data.host}${frame.path}/256/{z}/{x}/{y}/2/1_1.png`,
          {
            minZoom: 3,
            maxZoom: 7,
            opacity,
            attribution:
              'Radar &copy; <a href="https://www.rainviewer.com/">RainViewer</a>',
          },
        ).addTo(map);

        if (timeLabelRef.current) {
          timeLabelRef.current.textContent =
            new Intl.DateTimeFormat("en-US", {
              hour: "numeric",
              minute: "2-digit",
            }).format(
              new Date(frame.isoTime),
            );
        }
      };

      showFrame(currentIndex);

      if (animate && frames.length > 1) {
        intervalId = window.setInterval(() => {
          currentIndex =
            (currentIndex + 1) %
            frames.length;
          showFrame(currentIndex);
        }, frameDurationMs);
      }

      resizeObserver = new ResizeObserver(() => {
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

      if (intervalId !== null) {
        window.clearInterval(intervalId);
      }

      resizeObserver?.disconnect();
      radarLayer?.remove();
      map?.remove();
    };
  }, [
    animate,
    data.frames,
    data.host,
    frameDurationMs,
    opacity,
    showLocationMarker,
    source.latitude,
    source.longitude,
    zoom,
  ]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden rounded-xl bg-slate-200">
      <div
        ref={containerRef}
        className="h-full min-h-44 w-full"
      />

      <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-slate-950/75 px-2 py-1 text-xs text-white shadow">
        <span ref={timeLabelRef}>
          Loading radar
        </span>
      </div>

      <div className="pointer-events-none absolute bottom-2 right-2 rounded-lg bg-white/85 px-2 py-1 text-[10px] text-slate-700 shadow">
        Past 2 hours
      </div>
    </div>
  );
}
