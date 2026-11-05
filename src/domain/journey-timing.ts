import { DAY_MS, milliseconds } from "./community";
import type { JourneyStart, ProgressMap } from "./types";
export function journeyStarted(
  progress: ProgressMap,
  journey: JourneyStart | null,
) {
  return (
    !!journey || Object.values(progress).some((p) => p.completions.length > 0)
  );
}
/** Daily periods use the start minute so reminders and unlocks agree on both phones. */
export function nextJourneySlot(
  start: string,
  lastCompletion: string | number,
) {
  const anchor = Math.floor(Date.parse(start) / 60000) * 60000;
  const last =
    typeof lastCompletion === "number"
      ? lastCompletion
      : Date.parse(lastCompletion);
  return new Date(
    anchor + (Math.floor((last - anchor) / DAY_MS) + 1) * DAY_MS,
  ).toISOString();
}
export function journeyAvailableAt(
  progress: ProgressMap,
  start?: string | null,
): string | null {
  if (!start) {
    const times = Object.values(progress)
      .map((p) => milliseconds(p.nextAvailableAt))
      .filter((v): v is number => v !== null);
    return times.length ? new Date(Math.max(...times)).toISOString() : null;
  }
  const times = Object.values(progress)
    .map(
      (p) =>
        milliseconds(p.lastCompletionAt) ??
        milliseconds(p.completions.at(-1)?.completedAt),
    )
    .filter((v): v is number => v !== null);
  return times.length ? nextJourneySlot(start, Math.max(...times)) : null;
}
