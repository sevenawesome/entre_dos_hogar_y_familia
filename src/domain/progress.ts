import type { Level, Progress, ProgressMap } from "./types";
import { journeyAvailableAt } from "./journey-timing";
export function emptyProgress(levelId: string): Progress {
  return {
    levelId,
    completions: [],
    answers: {},
    finishedAt: null,
    nextAvailableAt: null,
  };
}
export function isUnlocked(level: Level, progress: ProgressMap) {
  return !level.prerequisiteId || !!progress[level.prerequisiteId]?.finishedAt;
}
export function currentChallenge(level: Level, progress?: Progress) {
  const done = new Set(progress?.completions.map((c) => c.challengeId));
  return level.challenges.find((c) => !done.has(c.id));
}
export function percentage(level: Level, progress?: Progress) {
  return Math.round(
    ((progress?.completions.length ?? 0) /
      Math.max(1, level.challenges.length)) *
      100,
  );
}
export function canComplete(progress: Progress | undefined, now = new Date()) {
  return (
    !progress?.nextAvailableAt || new Date(progress.nextAvailableAt) <= now
  );
}
export function canCompleteJourney(
  progress: ProgressMap,
  now = new Date(),
  startedAt?: string | null,
) {
  const next = journeyAvailableAt(progress, startedAt);
  return !next || new Date(next) <= now;
}
export function nextLocalDay(timezone: string, now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  // Find the start of the next calendar day, including daylight-saving changes.
  let low = now.getTime(),
    high = low + 27 * 60 * 60 * 1000;
  while (high - low > 1000) {
    const middle = Math.floor((low + high) / 2);
    if (
      new Intl.DateTimeFormat("en-CA", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(middle) === day
    )
      low = middle;
    else high = middle;
  }
  return new Date(Math.ceil(high / 1000) * 1000).toISOString();
}
