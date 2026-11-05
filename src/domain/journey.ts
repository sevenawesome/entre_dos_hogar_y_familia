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
