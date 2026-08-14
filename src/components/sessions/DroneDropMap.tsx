"use client";

import {
  useEffect,
  useRef,
} from "react";
import type {
  Map as LeafletMap,
} from "leaflet";
import type {
  DroneFishingDrop,
} from "@/types/sessions";

type Point = {
  latitude: number;
  longitude: number;
};

export function DroneDropMap({
  userLocation,
  selectedLocation,
  drops,
  windFromDegrees,
  onSelect,
}: {
  userLocation: Point;
  selectedLocation?: Point;
  drops: DroneFishingDrop[];
  windFromDegrees?: number;
  onSelect: (point: Point) => void;
}) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container) {
      return;
    }

    let disposed = false;
    let map: LeafletMap | null = null;
    let resizeObserver:
      | ResizeObserver
      | null = null;

    async function initialize() {
      const L = await import("leaflet");

      if (
        disposed ||
        !containerRef.current
      ) {
        return;
      }

      const center = selectedLocation ??
        (drops[0]
          ? {
              latitude:
                drops[0].latitude,
              longitude:
                drops[0].longitude,
            }
          : userLocation);

      map = L.map(
        containerRef.current,
        {
          center: [
            center.latitude,
            center.longitude,
          ],
          zoom: 15,
          minZoom: 3,
          maxZoom: 19,
          zoomControl: true,
          attributionControl: true,
        },
      );

      L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        },
      ).addTo(map);

      L.circleMarker(
        [
          userLocation.latitude,
          userLocation.longitude,
        ],
        {
          radius: 8,
          color: "#ffffff",
          weight: 3,
          fillColor: "#0f172a",
          fillOpacity: 1,
        },
      )
        .bindTooltip("You", {
          direction: "top",
        })
        .addTo(map);

      if (
        typeof windFromDegrees ===
        "number"
      ) {
        const toward =
          normalizeDegrees(
            windFromDegrees + 180,
          );

        L.marker(
          [
            userLocation.latitude,
            userLocation.longitude,
          ],
          {
            interactive: false,
            icon: L.divIcon({
              className: "",
              html: `<div title="Wind blowing toward ${Math.round(
                toward,
              )}°" style="width:38px;height:38px;display:flex;align-items:center;justify-content:center;border-radius:999px;border:1px solid rgba(8,127,140,.35);background:rgba(255,255,255,.92);color:#087f8c;box-shadow:0 3px 10px rgba(15,23,42,.12);transform:translate(24px,-24px) rotate(${toward}deg);font-size:24px;font-weight:700;">↑</div>`,
              iconSize: [38, 38],
              iconAnchor: [19, 19],
            }),
          },
        ).addTo(map);
      }

      for (const drop of drops) {
        const active =
          drop.retrievedAt === null;
        const color =
          drop.caughtFishAt
            ? "#15803d"
            : drop.biteAt
              ? "#d97706"
              : active
                ? "#087f8c"
                : "#64748b";

        L.circleMarker(
          [
            drop.latitude,
            drop.longitude,
          ],
          {
            radius: active ? 10 : 7,
            color: "#ffffff",
            weight: active ? 3 : 2,
            fillColor: color,
            fillOpacity:
              active ? 1 : 0.66,
          },
        )
          .bindTooltip(
            `${drop.rodLabel} · Drop ${drop.dropNumber}`,
            {
              permanent: active,
              direction: "top",
              offset: [0, -8],
            },
          )
          .addTo(map);
      }

      if (selectedLocation) {
        L.circleMarker(
          [
            selectedLocation.latitude,
            selectedLocation.longitude,
          ],
          {
            radius: 10,
            color: "#ffffff",
            weight: 3,
            fillColor: "#ef4444",
            fillOpacity: 1,
          },
        )
          .bindTooltip(
            "New drop",
            {
              direction: "top",
            },
          )
          .addTo(map);

        L.polyline(
          [
            [
              userLocation.latitude,
              userLocation.longitude,
            ],
            [
              selectedLocation.latitude,
              selectedLocation.longitude,
            ],
          ],
          {
            color: "#087f8c",
            weight: 2,
            opacity: 0.65,
            dashArray: "6 7",
          },
        ).addTo(map);

        const bounds = L.latLngBounds([
          [
            userLocation.latitude,
            userLocation.longitude,
          ],
          [
            selectedLocation.latitude,
            selectedLocation.longitude,
          ],
        ]);

        map.fitBounds(bounds, {
          padding: [48, 48],
          maxZoom: 17,
        });
      }

      map.on("click", (event) => {
        onSelect({
          latitude: event.latlng.lat,
          longitude:
            event.latlng.lng,
        });
      });

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
      map?.remove();
    };
  }, [
    drops,
    onSelect,
    selectedLocation,
    userLocation,
    windFromDegrees,
  ]);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
      <div
        ref={containerRef}
        className="h-[340px] w-full bg-slate-200 sm:h-[430px]"
      />
      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border)] bg-white px-3 py-2 text-[11px] text-[var(--muted)]">
        <span>● Black: you</span>
        <span className="text-red-600">
          ● Red: new drop
        </span>
        <span className="text-[var(--accent)]">
          ● Teal: active
        </span>
        <span className="text-amber-600">
          ● Amber: bite
        </span>
        <span className="text-green-700">
          ● Green: fish
        </span>
      </div>
    </div>
  );
}

function normalizeDegrees(
  value: number,
): number {
  return (
    ((value % 360) + 360) % 360
  );
}
