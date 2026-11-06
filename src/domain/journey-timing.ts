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
/** A pending challenge never expires. Only completing it starts the next wait. */
export function nextChallengeAvailableAt(lastCompletion: string | number) {
  const last =
    typeof lastCompletion === "number"
      ? lastCompletion
      : Date.parse(lastCompletion);
  return new Date(last + DAY_MS).toISOString();
}
export function journeyAvailableAt(progress: ProgressMap): string | null {
  const times = Object.values(progress)
    .map((p) => {
      const confirmed = milliseconds(p.lastCompletionAt);
      if (confirmed !== null) return confirmed + DAY_MS;
      // Older saved profiles have only nextAvailableAt; keep their existing wait.
      return milliseconds(p.nextAvailableAt);
    })
    .filter((v): v is number => v !== null);
  return times.length ? new Date(Math.max(...times)).toISOString() : null;
}
