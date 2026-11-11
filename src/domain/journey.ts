import type { Level, ProgressMap } from "./types";
export function getJourney(
  levels: Level[],
  progress: ProgressMap,
  ready = true,
) {
  const ordered = [...levels].sort((a, b) => a.order - b.order);
  const completed = ordered.filter((l) => !!progress[l.id]?.finishedAt);
  const active = ordered.find(
    (l) =>
      !progress[l.id]?.finishedAt &&
      (!l.prerequisiteId || !!progress[l.prerequisiteId]?.finishedAt),
  );
  const state: "loading" | "empty" | "completed" | "locked" | "active" | "new" =
    !ready
      ? "loading"
      : !ordered.length
        ? "empty"
        : active
          ? active.order > 1 && !progress[active.id]?.completions.length
            ? "new"
            : "active"
          : completed.length === ordered.length
            ? "completed"
            : "locked";
  return {
    state,
    current: ready ? active : undefined,
    completed,
    latestCompleted: completed.at(-1),
    nextLocked: ordered.find(
      (l) => !progress[l.id]?.finishedAt && l.id !== active?.id,
    ),
  };
}

/** Resolve reminders against synced progress rather than an old notification's challenge. */
export function reminderChallenge(levels: Level[], progress: ProgressMap) {
  const level = getJourney(levels, progress).current;
  if (!level) return null;
  const completed = new Set(
    progress[level.id]?.completions.map((c) => c.challengeId),
  );
  const challenge = level.challenges.find((c) => !completed.has(c.id));
  return challenge ? { levelId: level.id, challengeId: challenge.id } : null;
}
