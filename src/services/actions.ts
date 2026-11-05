import { store, actions } from "../store";
import { publicProjection } from "../domain/community";
import {
  currentChallenge,
  emptyProgress,
  isUnlocked,
  canCompleteJourney,
} from "../domain/progress";
import { saveFamily } from "./api";
import { completeSparkChallenge, finishSparkLevel } from "./spark";
import type { Family } from "../domain/types";
function syncDemoProfile() {
  const state = store.getState().app;
  if (state.demo && state.family && state.communityProfile)
    store.dispatch(
      actions.communityProfile(
        publicProjection(state.communityProfile, state.family, state.progress),
      ),
    );
}
export async function updateFamily(family: Family) {
  const state = store.getState().app;
  if (state.demo) {
    store.dispatch(actions.family(family));
    syncDemoProfile();
  } else await saveFamily(state.uid!, family);
}
export async function completeChallenge(
  levelId: string,
  challengeId: string,
  note: string,
) {
  const state = store.getState().app;
  if (!state.demo) {
    await completeSparkChallenge(levelId, challengeId, note);
    return;
  }
  const level = state.levels.find((l) => l.id === levelId)!;
  const previous = state.progress[levelId] ?? emptyProgress(levelId);
  if (previous.completions.some((c) => c.challengeId === challengeId)) return;
  if (
    !isUnlocked(level, state.progress) ||
    currentChallenge(level, previous)?.id !== challengeId ||
    !canCompleteJourney(state.progress)
  )
    throw new Error("El próximo reto se abre 24 horas después del anterior.");
  store.dispatch(
    actions.progress({
      ...state.progress,
      [levelId]: {
        ...previous,
        completions: [
          ...previous.completions,
          {
            challengeId,
            completedAt: new Date().toISOString(),
            note: note.trim(),
          },
        ],
        nextAvailableAt: new Date(Date.now() + 86400000).toISOString(),
      },
    }),
  );
  syncDemoProfile();
}
export async function finishLevel(
  levelId: string,
  answers: Record<string, string>,
) {
  const state = store.getState().app;
  if (!state.demo) {
    await finishSparkLevel(levelId, answers);
    return;
  }
  const level = state.levels.find((l) => l.id === levelId)!;
  const previous = state.progress[levelId];
  if (
    !previous ||
    currentChallenge(level, previous) ||
    level.questions.some((q) => !answers[q.id]?.trim())
  )
    throw new Error(
      "Completen todos los retos y las preguntas antes de terminar.",
    );
  store.dispatch(
    actions.progress({
      ...state.progress,
      [levelId]: { ...previous, answers, finishedAt: new Date().toISOString() },
    }),
  );
  syncDemoProfile();
}
