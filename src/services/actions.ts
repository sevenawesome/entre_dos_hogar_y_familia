import { store, actions } from "../store";
import {
  currentChallenge,
  emptyProgress,
  isUnlocked,
  canComplete,
  nextLocalDay,
} from "../domain/progress";
import { callBackend, saveFamily } from "./api";
import type { Family } from "../domain/types";
export async function updateFamily(family: Family) {
  const state = store.getState().app;
  if (state.demo) store.dispatch(actions.family(family));
  else await saveFamily(state.uid!, family);
}
export async function completeChallenge(
  levelId: string,
  challengeId: string,
  note: string,
) {
  const state = store.getState().app;
  if (!state.demo) {
    await callBackend("completeChallenge", { levelId, challengeId, note });
    return;
  }
  const level = state.levels.find((l) => l.id === levelId)!;
  const previous = state.progress[levelId] ?? emptyProgress(levelId);
  if (previous.completions.some((c) => c.challengeId === challengeId)) return;
  if (
    !isUnlocked(level, state.progress) ||
    currentChallenge(level, previous)?.id !== challengeId ||
    !canComplete(previous)
  )
    throw new Error("El próximo reto estará disponible mañana.");
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
        nextAvailableAt: nextLocalDay(state.family!.timezone),
      },
    }),
  );
}
export async function finishLevel(
  levelId: string,
  answers: Record<string, string>,
) {
  const state = store.getState().app;
  if (!state.demo) {
    await callBackend("finishLevel", { levelId, answers });
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
}
