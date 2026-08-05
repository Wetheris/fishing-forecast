"use client";

import { useId } from "react";
import type {
  TideEvent,
  TideTimelinePoint,
} from "@/types/source-data";

export function TideChart({
  events,
  timeline,
  currentLocalTime,
  showCurrentMarker,
  showHighLowLabels,
}: {
  events: TideEvent[];
  timeline: TideTimelinePoint[];
  currentLocalTime: string;
  showCurrentMarker: boolean;
  showHighLowLabels: boolean;
}) {
  const gradientId = useId().replaceAll(":", "");
  const width = 960;
  const height = 280;
  const left = 62;
  const right = 54;
  const top = 38;
  const bottom = 64;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  const series =
    timeline.length >= 2
      ? timeline
      : events.map((event) => ({
          localTime: event.localTime,
          heightFt: event.heightFt,
        }));

  if (series.length < 2) {
    return (
      <p className="text-sm text-[var(--muted)]">
        More tide predictions are needed to draw the chart.
      </p>
    );
  }

  const firstTime = localKeyToMilliseconds(
    series[0].localTime,
  );
  const lastTime = localKeyToMilliseconds(
    series.at(-1)?.localTime ??
      series[0].localTime,
  );
  const duration = Math.max(1, lastTime - firstTime);
  const heights = series.map(
    (point) => point.heightFt,
  );
  const minimum = Math.min(...heights);
  const maximum = Math.max(...heights);
  const verticalPadding = Math.max(
    0.35,
    (maximum - minimum) * 0.15,
  );
  const displayMinimum = minimum - verticalPadding;
  const displayMaximum = maximum + verticalPadding;
  const range = Math.max(
    0.1,
    displayMaximum - displayMinimum,
  );

  const chartPoints = series.map((point) => ({
    ...point,
    x:
      left +
      ((localKeyToMilliseconds(point.localTime) -
        firstTime) /
        duration) *
        chartWidth,
    y:
      top +
      ((displayMaximum - point.heightFt) / range) *
        chartHeight,
  }));

  const eventPoints = events
    .filter(
      (event) =>
        localKeyToMilliseconds(event.localTime) >=
          firstTime &&
        localKeyToMilliseconds(event.localTime) <=
          lastTime,
    )
    .map((event) => ({
      ...event,
      x:
        left +
        ((localKeyToMilliseconds(event.localTime) -
          firstTime) /
          duration) *
          chartWidth,
      y:
        top +
        ((displayMaximum - event.heightFt) / range) *
          chartHeight,
    }));

  const linePath = buildPath(chartPoints);
  const baseY = top + chartHeight;
  const areaPath = `${linePath} L ${
    chartPoints.at(-1)?.x ?? left
  } ${baseY} L ${chartPoints[0].x} ${baseY} Z`;

  const currentPoint = interpolateCurrentPoint(
    chartPoints,
    currentLocalTime,
  );

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto max-h-full w-full max-w-[1120px]"
        role="img"
        aria-label="NOAA tide prediction curve showing upcoming high and low tides"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="var(--accent)"
              stopOpacity="0.48"
            />
            <stop
              offset="100%"
              stopColor="var(--accent)"
              stopOpacity="0.10"
            />
          </linearGradient>
        </defs>

        <line
          x1={left}
          y1={baseY}
          x2={width - right}
          y2={baseY}
          stroke="var(--border)"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />

        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
        />
        <path
          d={linePath}
          fill="none"
          stroke="var(--accent-strong)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {eventPoints.map((point) => (
          <g key={`${point.type}-${point.localTime}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="white"
              stroke="var(--accent-strong)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />

            {showHighLowLabels ? (
              <text
                x={point.x}
                y={
                  point.type === "high"
                    ? Math.max(19, point.y - 16)
                    : Math.min(
                        baseY - 8,
                        point.y + 26,
                      )
                }
                textAnchor="middle"
                fontSize="14"
                fontWeight="600"
                fill="var(--foreground)"
                paintOrder="stroke"
                stroke="white"
                strokeWidth="4"
              >
                {point.type === "high"
                  ? "High"
                  : "Low"}{" "}
                {point.heightFt.toFixed(1)} ft
              </text>
            ) : null}

            <text
              x={point.x}
              y={baseY + 31}
              textAnchor="middle"
              fontSize="14"
              fill="var(--muted)"
            >
              {point.displayTime}
            </text>
          </g>
        ))}

        {showCurrentMarker && currentPoint ? (
          <g>
            <line
              x1={currentPoint.x}
              y1={top}
              x2={currentPoint.x}
              y2={baseY}
              stroke="var(--foreground)"
              strokeWidth="1.5"
              strokeDasharray="6 5"
              opacity="0.65"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={currentPoint.x}
              cy={currentPoint.y}
              r="7"
              fill="var(--foreground)"
              stroke="white"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={currentPoint.x}
              y={top - 10}
              textAnchor="middle"
              fontSize="14"
              fontWeight="600"
              fill="var(--foreground)"
            >
              Now
            </text>
          </g>
        ) : null}
      </svg>
    </div>
  );
}

function buildPath(
  points: Array<{ x: number; y: number }>,
): string {
  if (points.length === 0) {
    return "";
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (
    let index = 1;
    index < points.length;
    index += 1
  ) {
    const previous = points[index - 1];
    const current = points[index];
    const middleX =
      (previous.x + current.x) / 2;

    path += ` C ${middleX} ${previous.y}, ${middleX} ${current.y}, ${current.x} ${current.y}`;
  }

  return path;
}

function interpolateCurrentPoint(
  points: Array<{
    localTime: string;
    x: number;
    y: number;
  }>,
  currentLocalTime: string,
): { x: number; y: number } | null {
  const currentTime = localKeyToMilliseconds(
    currentLocalTime,
  );

  for (
    let index = 0;
    index < points.length - 1;
    index += 1
  ) {
    const previous = points[index];
    const next = points[index + 1];
    const previousTime = localKeyToMilliseconds(
      previous.localTime,
    );
    const nextTime = localKeyToMilliseconds(
      next.localTime,
    );

    if (
      currentTime >= previousTime &&
      currentTime <= nextTime
    ) {
      const range = Math.max(
        1,
        nextTime - previousTime,
      );
      const progress =
        (currentTime - previousTime) / range;

      return {
        x:
          previous.x +
          (next.x - previous.x) * progress,
        y:
          previous.y +
          (next.y - previous.y) * progress,
      };
    }
  }

  return null;
}

function localKeyToMilliseconds(
  localTime: string,
): number {
  const match = localTime.match(
    /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/,
  );

  if (!match) {
    return 0;
  }

  return Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
  );
}
