export function validTimezone(value: unknown): value is string {
  try {
    if (typeof value !== "string" || value.length > 100) return false;
    new Intl.DateTimeFormat("en", { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
}
export function nextReminder(
  timezone: string,
  hour: number,
  minute: number,
  from = new Date(),
): Date {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const wanted = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const start = Math.floor(from.getTime() / 60000) * 60000 + 60000;
  // Minute search handles DST gaps and repeated hours without guessing UTC offsets.
  for (
    let timestamp = start;
    timestamp < start + 50 * 3600000;
    timestamp += 60000
  )
    if (formatter.format(timestamp) === wanted) return new Date(timestamp);
  throw new Error("No se pudo calcular el siguiente recordatorio.");
}
