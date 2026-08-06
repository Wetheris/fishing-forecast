export function WindDirectionArrow({
  fromDegrees,
  size = 28,
}: {
  fromDegrees: number;
  size?: number;
}) {
  const travelDegrees =
    ((fromDegrees + 180) % 360 + 360) % 360;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center text-[var(--accent)]"
      style={{
        width: size,
        height: size,
        transform: `rotate(${travelDegrees}deg)`,
      }}
      title={`Wind traveling toward ${Math.round(
        travelDegrees,
      )}°`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
      >
        <path
          d="M12 20V5M12 5 6.5 10.5M12 5l5.5 5.5"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
