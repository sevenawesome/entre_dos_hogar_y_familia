import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, cloud } from "./firebase";
import type {
  Family,
  Level,
  ProgressMap,
  AnniversaryCatalog,
  AppSettings,
  FamilyControls,
} from "../domain/types";
import { defaultSettings } from "../domain/settings";
import { bundledAnniversaries } from "../data/anniversaries";
export function subscribeSettings(
  callback: (settings: AppSettings) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(db!, "config", "app"),
    (snap) =>
      callback(
        snap.exists()
          ? ({ ...defaultSettings, ...snap.data() } as AppSettings)
          : defaultSettings,
      ),
    onError,
  );
}
export function subscribeControls(
  uid: string,
  callback: (controls: FamilyControls) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(db!, "familyControls", uid),
    (snap) =>
      callback({ remindersPaused: snap.data()?.remindersPaused === true }),
    onError,
  );
}
export function subscribeAnniversaries(
  callback: (catalog: AnniversaryCatalog) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(db!, "catalogs", "anniversaries"),
    (snap) =>
      callback(
        snap.exists()
          ? (snap.data() as AnniversaryCatalog)
          : bundledAnniversaries,
      ),
    onError,
  );
}
export function subscribeFamily(
  uid: string,
  callback: (family: Family | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(db!, "families", uid),
    (snap) => callback(snap.exists() ? (snap.data() as Family) : null),
    onError,
  );
}
export function subscribeProgress(
  uid: string,
  callback: (progress: ProgressMap) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    collection(db!, "families", uid, "progress"),
    (snap) =>
      callback(
        Object.fromEntries(
          snap.docs.map((d) => [d.id, d.data()]),
        ) as ProgressMap,
      ),
    onError,
  );
}
export function subscribeCatalog(
  callback: (levels: Level[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(collection(db!, "levels"), where("published", "==", true)),
    (snap) =>
      callback(
        snap.docs
          .map((d) => ({ ...d.data(), id: d.id }) as Level)
          .sort((a, b) => a.order - b.order),
      ),
    onError,
  );
}
export async function saveFamily(uid: string, family: Family) {
  await setDoc(doc(db!, "families", uid), family, { merge: true });
}
export async function callBackend(name: string, data: unknown) {
  if (!cloud) throw new Error("Firebase no está configurado.");
  return httpsCallable(cloud, name)(data);
}
export function friendlyError(error: unknown): string {
  const code = (error as { code?: string }).code;
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Revisa el correo y la contraseña.",
    "auth/email-already-in-use":
      "Este correo ya tiene una cuenta. Inicia sesión.",
    "auth/invalid-email": "Escribe un correo válido.",
    "auth/weak-password": "Usa al menos 8 caracteres.",
    "auth/network-request-failed": "No hay conexión. Vuelve a intentarlo.",
    "auth/too-many-requests": "Espera un momento antes de intentarlo otra vez.",
    "auth/requires-recent-login":
      "Por seguridad, cierra sesión y vuelve a ingresar antes de eliminar la cuenta.",
    "functions/unavailable":
      "No pudimos conectar. Comprueba tu conexión y vuelve a intentarlo.",
    "permission-denied":
      "No pudimos acceder a los datos. Revisa la configuración de Firebase.",
  };
  return (
    messages[code ?? ""] ??
    (error instanceof Error
      ? error.message.replace(/^Firebase: /, "")
      : "Ocurrió un problema. Vuelve a intentarlo.")
  );
}
