import { defaultBranding, validateBranding } from "../domain/branding";
import { migrateEmailBrand } from "../domain/email-settings";
import { effectivePermissions } from "../domain/admin-permissions";
import { emailServiceOff } from "../domain/email-reminders";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  limit,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { store, actions } from "../store";
import { milliseconds, DAY_MS } from "../domain/community";
import type {
  Family,
  Level,
  ProgressMap,
  AnniversaryCatalog,
  AppSettings,
  FamilyControls,
  AccountRole,
  CommunityProfile,
  FamilyMessage,
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
export function subscribeSocial(uid: string, onError: (e: Error) => void) {
  return [
    onSnapshot(
      doc(db!, "config", "email"),
      (snap) => {
        const data = migrateEmailBrand(snap.data() ?? {});
        store.dispatch(
          actions.emailService({
            ...emailServiceOff,
            ...data,
            lastRunAt: data.lastRunAt?.toDate?.().toISOString(),
          }),
        );
      },
      onError,
    ),
    onSnapshot(
      doc(db!, "portraits", uid),
      (snap) => store.dispatch(actions.portraits(snap.data()?.people ?? {})),
      onError,
    ),
    onSnapshot(
      doc(db!, "journeys", uid),
      (snap) => {
        const time = milliseconds(snap.data()?.startedAt);
        store.dispatch(
          actions.journey(
            time === null
              ? null
              : {
                  startedAt: new Date(time).toISOString(),
                  levelId: snap.data()!.levelId,
                },
          ),
        );
      },
      onError,
    ),
    onSnapshot(
      doc(db!, "roles", uid),
      (snap) => {
        const data = snap.data() ?? { role: "member" };
        store.dispatch(actions.role(data.role as AccountRole));
        store.dispatch(actions.permissions(effectivePermissions(data)));
      },
      onError,
    ),
    onSnapshot(
      doc(db!, "avatars", uid),
      (snap) => store.dispatch(actions.avatar(snap.data()?.dataUri ?? null)),
      onError,
    ),
    onSnapshot(
      doc(db!, "community", uid),
      (snap) => {
        if (!snap.exists()) {
          store.dispatch(actions.communityProfile(null));
          return;
        }
        const { updatedAt: _updated, ...data } = snap.data();
        store.dispatch(actions.communityProfile(data as CommunityProfile));
      },
      onError,
    ),
    onSnapshot(
      query(
        collection(db!, "families", uid, "inbox"),
        orderBy("createdAt", "desc"),
        limit(30),
      ),
      (snap) =>
        store.dispatch(
          actions.inbox(
            snap.docs.map(
              (d) =>
                ({
                  ...d.data(),
                  id: d.id,
                  createdAt:
                    d.data().createdAt?.toDate?.().toISOString() ?? null,
                }) as FamilyMessage,
            ),
          ),
        ),
      onError,
    ),
  ];
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
          ? ({
              ...snap.data(),
              note: String(snap.data()?.note ?? "").replace(
                /ENTRE DOS|Entre dos|Entre Dos/g,
                "Amor que permanece",
              ),
            } as AnniversaryCatalog)
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
          snap.docs.map((d) => {
            const data = d.data();
            const time = milliseconds(data.lastCompletionAt);
            return [
              d.id,
              {
                levelId: data.levelId,
                completions: data.completions,
                answers: data.answers,
                finishedAt: data.finishedAt,
                lastCompletionAt:
                  time === null ? null : new Date(time).toISOString(),
                nextAvailableAt:
                  time !== null
                    ? new Date(time + DAY_MS).toISOString()
                    : data.nextAvailableAt,
              },
            ];
          }),
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
  const { saveSparkFamily } = await import("./spark");
  await saveSparkFamily(uid, family);
}
export async function callBackend(name: string, data: unknown) {
  if (name === "deleteFamilyAccount") {
    const { deleteSparkAccount } = await import("./spark");
    await deleteSparkAccount();
    return { data: { ok: true } };
  }
  const { adminRequest } = await import("./spark-admin");
  return { data: await adminRequest(name, data) };
}
export function friendlyError(error: unknown): string {
  const code = (error as { code?: string }).code;
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Revisa el correo y la contraseña.",
    "auth/email-already-in-use":
      "Este correo ya tiene una cuenta. Inicia sesión.",
    "auth/invalid-email": "Escribe un correo válido.",
    "auth/weak-password": "Usa al menos 8 caracteres.",
    "auth/wrong-password": "La contraseña actual no es correcta.",
    "auth/password-does-not-meet-requirements":
      "La contraseña no cumple los requisitos de seguridad. Elige otra más segura.",
    "auth/network-request-failed": "No hay conexión. Vuelve a intentarlo.",
    "auth/too-many-requests": "Espera un momento antes de intentarlo otra vez.",
    "auth/requires-recent-login":
      "Por seguridad, cierra sesión y vuelve a ingresar para realizar esta acción.",
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

/** Only public identity text is readable before login; account/app settings remain protected. */
export function subscribeBranding() {
  if (!db) return () => {};
  return onSnapshot(
    doc(db, "config", "branding"),
    (snap) => {
      try {
        store.dispatch(
          actions.branding(
            snap.exists()
              ? validateBranding(
                  snap.data() as unknown as typeof defaultBranding,
                )
              : defaultBranding,
          ),
        );
      } catch {
        store.dispatch(actions.branding(defaultBranding));
      }
    },
    () => {},
  );
}
