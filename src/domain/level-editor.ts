import type { Challenge, Level } from "./types";
export function createLevelDraft(levels: Level[]): Level {
  const order = Math.max(0, ...levels.map((l) => l.order)) + 1;
  const previous = [...levels]
    .filter((l) => l.published)
    .sort((a, b) => b.order - a.order)[0];
  return {
    id: `nivel-${order}`,
    order,
    title: "",
    subtitle: "",
    description: "",
    published: false,
    prerequisiteId: previous?.id ?? null,
    challenges: [newChallenge([])],
    questions: [{ id: "pregunta-1", label: "" }],
  };
}
export function newChallenge(challenges: Challenge[]): Challenge {
  let n = 1;
  while (challenges.some((c) => c.id === `reto-${n}`)) n++;
  return {
    id: `reto-${n}`,
    order: challenges.length + 1,
    title: "",
    description: "",
    reflection: "",
    stage: "",
    minutes: 15,
  };
}
export function reorderChallenges(
  challenges: Challenge[],
  from: number,
  to: number,
) {
  if (
    from < 0 ||
    to < 0 ||
    from >= challenges.length ||
    to >= challenges.length
  )
    return challenges;
  const next = [...challenges];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next.map((c, i) => ({ ...c, order: i + 1 }));
}
