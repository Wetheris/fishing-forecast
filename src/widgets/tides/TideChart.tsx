"use client";

import { useId } from "react";

type TideEvent = {
  type: string;
  time: string;
  heightFt: number;
};

export function TideChart({
  events,
  status,
  minutesUntilTurn,
  showCurrentMarker,
  showHighLowLabels,
}: {
  events: TideEvent[];
  status: string;
  minutesUntilTurn: number;
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

  if (events.length < 2) {
    return (
      <p className="text-sm text-[var(--muted)]">
        More tide predictions are needed to draw the chart.
      </p>
    );
  }

  const timedEvents = addContinuousMinutes(events);
  const firstMinute = timedEvents[0].minute;
  const lastMinute =
    timedEvents.at(-1)?.minute ?? firstMinute + 1;
  const duration = Math.max(
    1,
    lastMinute - firstMinute,
  );
  const heights = events.map(
    (event) => event.heightFt,
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

  const points = timedEvents.map((event) => ({
    ...event,
    x:
      left +
      ((event.minute - firstMinute) / duration) *
        chartWidth,
    y:
      top +
      ((displayMaximum - event.heightFt) / range) *
        chartHeight,
  }));

  const linePath = buildTidePath(points);
  const baseY = top + chartHeight;
  const areaPath = `${linePath} L ${
    points.at(-1)?.x ?? left
  } ${baseY} L ${points[0].x} ${baseY} Z`;

  const currentPoint = calculateCurrentPoint({
    points,
    status,
    minutesUntilTurn,
    firstMinute,
    duration,
    left,
    chartWidth,
    top,
    chartHeight,
    displayMinimum,
    displayMaximum,
  });

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto max-h-full w-full max-w-[1120px]"
        role="img"
        aria-label="Tide height curve showing upcoming high and low tide predictions"
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
          vectorEffect="non-scaling-stroke"
        />

        {points.map((point) => (
          <g key={`${point.type}-${point.time}`}>
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
                  point.type.toLowerCase() ===
                  "high"
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
                {point.type}{" "}
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
              {point.time}
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

function addContinuousMinutes(events: TideEvent[]) {
  let dayOffset = 0;
  let previousMinute = -1;

  return events.map((event) => {
    const parsed = parseClockTime(event.time);
    let minute = parsed + dayOffset;

    if (
      previousMinute >= 0 &&
      minute <= previousMinute
    ) {
      dayOffset += 24 * 60;
      minute = parsed + dayOffset;
    }

    previousMinute = minute;

    return {
      ...event,
      minute,
    };
  });
}

function parseClockTime(time: string): number {
  const match = time
    .trim()
    .match(
      /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i,
    );

  if (!match) {
    return 0;
  }

  let hour = Number(match[1]) % 12;
  const minute = Number(match[2]);
  const period = match[3].toUpperCase();

  if (period === "PM") {
    hour += 12;
  }

  return hour * 60 + minute;
}

function buildTidePath(
  points: Array<{ x: number; y: number }>,
): string {
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

function calculateCurrentPoint({
  points,
  status,
  minutesUntilTurn,
  firstMinute,
  duration,
  left,
  chartWidth,
  top,
  chartHeight,
  displayMinimum,
  displayMaximum,
}: {
  points: Array<{
    type: string;
    minute: number;
    heightFt: number;
  }>;
  status: string;
  minutesUntilTurn: number;
  firstMinute: number;
  duration: number;
  left: number;
  chartWidth: number;
  top: number;
  chartHeight: number;
  displayMinimum: number;
  displayMaximum: number;
}): { x: number; y: number } | null {
  const desiredType = status
    .toLowerCase()
    .includes("rising")
    ? "high"
    : "low";

  const nextIndex = points.findIndex(
    (point, index) =>
      index > 0 &&
      point.type.toLowerCase() ===
        desiredType,
  );

  if (nextIndex <= 0) {
    return null;
  }

  const previous = points[nextIndex - 1];
  const next = points[nextIndex];
  const currentMinute =
    next.minute - minutesUntilTurn;
  const interval = Math.max(
    1,
    next.minute - previous.minute,
  );
  const progress = Math.min(
    1,
    Math.max(
      0,
      (currentMinute - previous.minute) /
        interval,
    ),
  );
  const smoothProgress =
    progress * progress * (3 - 2 * progress);
  const height =
    previous.heightFt +
    (next.heightFt - previous.heightFt) *
      smoothProgress;

  const x =
    left +
    ((currentMinute - firstMinute) /
      duration) *
      chartWidth;
  const range = Math.max(
    0.1,
    displayMaximum - displayMinimum,
  );
  const y =
    top +
    ((displayMaximum - height) / range) *
      chartHeight;

  return { x, y };
}
