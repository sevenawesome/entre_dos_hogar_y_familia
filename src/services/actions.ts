import { store, actions } from "../store";
import { publicProjection } from "../domain/community";
import { validateFamilyProfile } from "../domain/admin-validation";
import {
  currentChallenge,
  emptyProgress,
  isUnlocked,
  canCompleteJourney,
} from "../domain/progress";
import { saveFamily } from "./api";
import {
  completeSparkChallenge,
  finishSparkLevel,
  startSparkJourney,
} from "./spark";
import {
  nextChallengeAvailableAt,
  journeyStarted,
} from "../domain/journey-timing";
import type { Family } from "../domain/types";
function syncDemoProfile() {
  const state = store.getState().app;
  if (state.demo && state.family && state.communityProfile)
    store.dispatch(
      actions.communityProfile(
        publicProjection(
          state.communityProfile,
          state.family,
          state.progress,
          state.portraits,
        ),
      ),
    );
}
export async function beginJourney(levelId: string) {
  const state = store.getState().app;
  if (state.demo) {
    if (!state.journey)
      store.dispatch(
        actions.journey({ levelId, startedAt: new Date().toISOString() }),
      );
    return store.getState().app.journey!;
  }
  const saved = await startSparkJourney(levelId);
  store.dispatch(actions.journey(saved));
  return saved;
}
export async function updateFamily(family: Family) {
  const state = store.getState().app;
  if (state.demo) {
    store.dispatch(actions.family(validateFamilyProfile(family)));
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
  if (!journeyStarted(state.progress, state.journey))
    throw new Error("Pulsen primero «Comenzar nuestro primer reto» en Hoy.");
  const previous = state.progress[levelId] ?? emptyProgress(levelId);
  if (previous.completions.some((c) => c.challengeId === challengeId)) return;
  if (
    !isUnlocked(level, state.progress) ||
    currentChallenge(level, previous)?.id !== challengeId ||
    !canCompleteJourney(state.progress)
  )
    throw new Error(
      "El siguiente reto se abre 24 horas después de completar el anterior.",
    );
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
        nextAvailableAt: nextChallengeAvailableAt(Date.now()),
        lastCompletionAt: new Date().toISOString(),
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
