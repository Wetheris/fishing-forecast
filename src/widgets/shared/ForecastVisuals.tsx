"use client";

import { useId } from "react";

export function WeatherConditionIcon({
  weatherCode,
  condition,
  size = 72,
}: {
  weatherCode: number;
  condition: string;
  size?: number;
}) {
  const kind = weatherIconKind(weatherCode);

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label={`${condition} icon`}
      className="shrink-0"
    >
      {kind === "clear" ? <Sun /> : null}
      {kind === "partly-cloudy" ? <PartlyCloudy /> : null}
      {kind === "cloudy" ? <Cloudy /> : null}
      {kind === "rain" ? <Rain /> : null}
      {kind === "snow" ? <Snow /> : null}
      {kind === "thunder" ? <Thunder /> : null}
      {kind === "fog" ? <Fog /> : null}
    </svg>
  );
}

export function HourlyTemperatureLineChart({
  points,
  temperatureUnit,
  showPointLabels,
  showRainChance,
}: {
  points: Array<{
    label: string;
    temperature: number;
    rainChancePercent: number | null;
  }>;
  temperatureUnit: "F" | "C";
  showPointLabels: boolean;
  showRainChance: boolean;
}) {
  const gradientId = useId().replaceAll(":", "");
  const width = Math.max(
    900,
    points.length * 105,
  );
  const height = 280;
  const left = 54;
  const right = 42;
  const top = 42;
  const bottom = showRainChance ? 70 : 52;
  const chartWidth = width - left - right;
  const chartHeight = height - top - bottom;

  if (points.length < 2) {
    return (
      <p className="text-sm text-[var(--muted)]">
        More hourly data is needed to draw the chart.
      </p>
    );
  }

  const values = points.map(
    (point) => point.temperature,
  );
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max(
    1,
    (maximum - minimum) * 0.25,
  );
  const displayMinimum = minimum - padding;
  const displayMaximum = maximum + padding;
  const range = Math.max(
    1,
    displayMaximum - displayMinimum,
  );

  const chartPoints = points.map(
    (point, index) => {
      const x =
        left +
        (index /
          Math.max(1, points.length - 1)) *
          chartWidth;
      const y =
        top +
        ((displayMaximum - point.temperature) /
          range) *
          chartHeight;

      return {
        ...point,
        x,
        y,
      };
    },
  );

  const linePath = buildSmoothPath(chartPoints);
  const areaPath = `${linePath} L ${
    chartPoints.at(-1)?.x ?? left
  } ${top + chartHeight} L ${
    chartPoints[0].x
  } ${top + chartHeight} Z`;

  return (
    <div className="flex h-full min-h-0 w-full items-center overflow-x-auto pb-1">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-auto max-h-full w-full"
        style={{ minWidth: width }}
        role="img"
        aria-label={`Hourly temperature line chart from ${Math.round(
          minimum,
        )} to ${Math.round(
          maximum,
        )} degrees ${temperatureUnit}`}
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
              stopOpacity="0.28"
            />
            <stop
              offset="100%"
              stopColor="var(--accent)"
              stopOpacity="0.03"
            />
          </linearGradient>
        </defs>

        <line
          x1={left}
          y1={top + chartHeight}
          x2={width - right}
          y2={top + chartHeight}
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
          stroke="var(--accent)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />

        {chartPoints.map((point) => (
          <g key={`${point.label}-${point.x}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="5"
              fill="var(--surface)"
              stroke="var(--accent)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />

            {showPointLabels ? (
              <text
                x={point.x}
                y={Math.max(
                  19,
                  point.y - 15,
                )}
                textAnchor="middle"
                fontSize="14"
                fontWeight="600"
                fill="var(--foreground)"
                paintOrder="stroke"
                stroke="var(--surface)"
                strokeWidth="4"
              >
                {Math.round(
                  point.temperature,
                )}
                °
              </text>
            ) : null}

            <text
              x={point.x}
              y={top + chartHeight + 29}
              textAnchor="middle"
              fontSize="13"
              fill="var(--muted)"
            >
              {point.label}
            </text>

            {showRainChance &&
            point.rainChancePercent !== null ? (
              <text
                x={point.x}
                y={top + chartHeight + 51}
                textAnchor="middle"
                fontSize="12"
                fill="var(--muted)"
              >
                {Math.round(
                  point.rainChancePercent,
                )}
                % rain
              </text>
            ) : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

export function MoonPhaseGraphic({
  phaseName,
  illuminationPercent,
  size = 104,
}: {
  phaseName: string;
  illuminationPercent: number;
  size?: number;
}) {
  const clipId = useId().replaceAll(":", "");
  const normalized = Math.min(
    1,
    Math.max(0, illuminationPercent / 100),
  );
  const lowerName = phaseName.toLowerCase();
  const isWaxing =
    lowerName.includes("waxing") ||
    lowerName.includes("first quarter");
  const isFull = lowerName.includes("full");
  const isNew = lowerName.includes("new");

  const radius = 42;
  const center = 50;
  const shadowShift = normalized * radius * 2;
  const shadowCenter = isWaxing
    ? center - shadowShift
    : center + shadowShift;

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role="img"
      aria-label={`${phaseName}, ${Math.round(
        illuminationPercent,
      )}% illuminated`}
      className="shrink-0"
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r={radius} />
        </clipPath>
        <radialGradient
          id={`${clipId}-moon`}
          cx="35%"
          cy="30%"
          r="70%"
        >
          <stop offset="0%" stopColor="#fffde7" />
          <stop offset="70%" stopColor="#e7e2c9" />
          <stop offset="100%" stopColor="#c9c3aa" />
        </radialGradient>
      </defs>

      <circle
        cx="50"
        cy="50"
        r="45"
        fill="var(--surface-muted)"
      />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill={`url(#${clipId}-moon)`}
      />

      <g clipPath={`url(#${clipId})`} opacity="0.28">
        <circle cx="33" cy="35" r="6" fill="#8e8977" />
        <circle cx="63" cy="28" r="4" fill="#8e8977" />
        <circle cx="69" cy="58" r="7" fill="#8e8977" />
        <circle cx="38" cy="67" r="5" fill="#8e8977" />
        <circle cx="53" cy="49" r="3" fill="#8e8977" />
      </g>

      {isFull ? null : isNew ? (
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="#172126"
          opacity="0.92"
        />
      ) : (
        <circle
          cx={shadowCenter}
          cy="50"
          r={radius}
          fill="#172126"
          opacity="0.92"
          clipPath={`url(#${clipId})`}
        />
      )}

      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        stroke="var(--border)"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function weatherIconKind(
  code: number,
):
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "rain"
  | "snow"
  | "thunder"
  | "fog" {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly-cloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (
    [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(
      code,
    )
  ) {
    return "rain";
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return "snow";
  }
  if ([95, 96, 99].includes(code)) return "thunder";
  return "cloudy";
}

function buildSmoothPath(
  points: Array<{ x: number; y: number }>,
): string {
  if (points.length === 0) {
    return "";
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const middleX = (previous.x + current.x) / 2;

    path += ` C ${middleX} ${previous.y}, ${middleX} ${current.y}, ${current.x} ${current.y}`;
  }

  return path;
}

function Sun() {
  return (
    <g>
      <g
        stroke="#e4a72c"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <line x1="32" y1="5" x2="32" y2="12" />
        <line x1="32" y1="52" x2="32" y2="59" />
        <line x1="5" y1="32" x2="12" y2="32" />
        <line x1="52" y1="32" x2="59" y2="32" />
        <line x1="13" y1="13" x2="18" y2="18" />
        <line x1="46" y1="46" x2="51" y2="51" />
        <line x1="13" y1="51" x2="18" y2="46" />
        <line x1="46" y1="18" x2="51" y2="13" />
      </g>
      <circle cx="32" cy="32" r="15" fill="#f3c654" />
    </g>
  );
}

function CloudShape({
  x = 5,
  y = 17,
  scale = 1,
}: {
  x?: number;
  y?: number;
  scale?: number;
}) {
  return (
    <path
      transform={`translate(${x} ${y}) scale(${scale})`}
      d="M11 28h31c7 0 12-5 12-11 0-6-5-11-12-11-2 0-4 .5-5.5 1.5C34 3 29 0 23 0 14 0 7 7 7 16v1C3 18 0 22 0 26c0 5 5 9 11 9Z"
      fill="#91a4aa"
      stroke="#6e838a"
      strokeWidth="1.5"
    />
  );
}

function PartlyCloudy() {
  return (
    <g>
      <circle cx="23" cy="21" r="12" fill="#f3c654" />
      <CloudShape x={8} y={22} scale={0.9} />
    </g>
  );
}

function Cloudy() {
  return <CloudShape x={5} y={16} scale={1} />;
}

function Rain() {
  return (
    <g>
      <CloudShape x={5} y={10} scale={1} />
      <g
        stroke="#2687b8"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <line x1="20" y1="48" x2="17" y2="56" />
        <line x1="33" y1="48" x2="30" y2="56" />
        <line x1="46" y1="48" x2="43" y2="56" />
      </g>
    </g>
  );
}

function Snow() {
  return (
    <g>
      <CloudShape x={5} y={9} scale={1} />
      <g fill="#6fa8c6">
        <circle cx="19" cy="52" r="2.5" />
        <circle cx="32" cy="55" r="2.5" />
        <circle cx="46" cy="51" r="2.5" />
      </g>
    </g>
  );
}

function Thunder() {
  return (
    <g>
      <CloudShape x={5} y={8} scale={1} />
      <path
        d="M34 43h9l-7 9h6L29 63l4-10h-7Z"
        fill="#e0a629"
      />
    </g>
  );
}

function Fog() {
  return (
    <g>
      <CloudShape x={8} y={7} scale={0.9} />
      <g
        stroke="#82969c"
        strokeWidth="3"
        strokeLinecap="round"
      >
        <line x1="11" y1="46" x2="53" y2="46" />
        <line x1="16" y1="54" x2="48" y2="54" />
      </g>
    </g>
  );
}
