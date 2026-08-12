"use client";

import {
  useEffect,
  useRef,
} from "react";
import type {
  CircleMarker,
  Map as LeafletMap,
} from "leaflet";

export function LocationPickerMap({
  latitude,
  longitude,
  onChange,
}: {
  latitude: number;
  longitude: number;
  onChange: (
    latitude: number,
    longitude: number,
  ) => void;
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
    let marker: CircleMarker | null =
      null;
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

      map = L.map(
        containerRef.current,
        {
          center: [
            latitude,
            longitude,
          ],
          zoom: 14,
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

      marker = L.circleMarker(
        [latitude, longitude],
        {
          radius: 8,
          color: "#ffffff",
          weight: 3,
          fillColor: "#087f8c",
          fillOpacity: 1,
        },
      ).addTo(map);

      map.on("click", (event) => {
        const nextLatitude =
          event.latlng.lat;
        const nextLongitude =
          event.latlng.lng;

        marker?.setLatLng([
          nextLatitude,
          nextLongitude,
        ]);

        onChange(
          nextLatitude,
          nextLongitude,
        );
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
    // The map owns click-to-update state after initialization.
    // Re-creating it for every coordinate change causes visual jumps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
      <div
        ref={containerRef}
        className="h-64 w-full bg-slate-200"
      />
      <p className="border-t border-[var(--border)] bg-white px-3 py-2 text-xs text-[var(--muted)]">
        Tap the map to move the catch pin.
      </p>
    </div>
  );
}
