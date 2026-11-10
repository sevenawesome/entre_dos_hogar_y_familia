import type { Level } from "./types";
/** Only presentation metadata is passed to the teaser; no activities or questions. */
export function levelIntroduction(level: Level) {
  return {
    id: level.id,
    order: level.order,
    title: level.title,
    subtitle: level.subtitle,
    description: level.description,
    challengeCount: level.challenges.length,
    questionCount: level.questions.length,
    prerequisiteId: level.prerequisiteId,
  };
}
export type LevelIntroduction = ReturnType<typeof levelIntroduction>;
export function unreadLevelNews(levels: Level[], read: string[]) {
  return levels
    .filter((l) => l.published && l.order > 1 && !read.includes(l.id))
    .sort((a, b) => a.order - b.order);
}
export function levelNewsNotice(
  levels: Level[],
  read: string[],
  notified: string[],
) {
  const unseen = unreadLevelNews(levels, read).filter(
    (l) => !notified.includes(l.id),
  );
  if (!unseen.length) return null;
  return {
    ids: unseen.map((l) => l.id),
    levelId: unseen[0].id,
    title:
      unseen.length === 1
        ? "¡Tenemos un nivel nuevo! ♡"
        : `¡Tenemos ${unseen.length} niveles nuevos! ♡`,
    body:
      unseen.length === 1
        ? `Nivel ${unseen[0].order}: ${unseen[0].title}. Conozcan de qué trata en la app.`
        : "Nuevos capítulos para seguir creciendo juntos. Conozcan sus presentaciones en la app.",
  };
}
