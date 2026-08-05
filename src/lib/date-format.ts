export function formatLocalHour(localDateTime: string): string {
  const timePart = localDateTime.split("T")[1];

  if (!timePart) {
    return localDateTime;
  }

  const [hourText, minute = "00"] = timePart.split(":");
  const hour = Number(hourText);

  if (!Number.isInteger(hour)) {
    return timePart;
  }

  const suffix = hour >= 12 ? "PM" : "AM";
  const twelveHour = hour % 12 || 12;
  const minuteText = minute === "00" ? "" : `:${minute}`;

  return `${twelveHour}${minuteText} ${suffix}`;
}

export function formatForecastDay(date: string): string {
  const parsed = new Date(`${date}T12:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(parsed);
}
