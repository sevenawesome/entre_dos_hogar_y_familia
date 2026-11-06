import {
  doc,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { store } from "../store";
import {
  nextEmailDate,
  type EmailPreferences,
} from "../domain/email-reminders";
export async function saveEmailPreferences(input: EmailPreferences) {
  const state = store.getState().app;
  if (
    input.enabled &&
    !input.challenges &&
    !input.celebrations &&
    !input.adminMessages
  )
    throw new Error("Elijan al menos un tipo de correo.");
  if (state.demo) throw new Error("La demostración no activa correos reales.");
  if (!auth?.currentUser || !db || !state.family)
    throw new Error("Inicia sesión para guardar tus correos.");
  const uid = auth.currentUser.uid,
    database = db;
  await runTransaction(database, async (tx) => {
    const ref = doc(database, "emailPreferences", uid),
      [old, service] = await Promise.all([
        tx.get(ref),
        tx.get(doc(database, "config", "email")),
      ]);
    if ((old.data()?.version ?? 0) !== input.version)
      throw new Error(
        "Las preferencias cambiaron. Revisa la pantalla y vuelve a guardar.",
      );
    if (
      input.enabled &&
      (!auth!.currentUser!.emailVerified ||
        !service.data()?.enabled ||
        service.data()?.paused)
    )
      throw new Error(
        "Confirma tu correo y espera a que el servicio de correos esté activado.",
      );
    const timezone = state.family!.timezone;
    tx.set(ref, {
      enabled: input.enabled,
      challenges: input.challenges,
      celebrations: input.celebrations,
      adminMessages: input.adminMessages,
      hour: input.hour,
      minute: input.minute,
      timezone,
      version: input.version + 1,
      nextDueAt: Timestamp.fromDate(
        nextEmailDate(timezone, input.hour, input.minute),
      ),
      updatedAt: serverTimestamp(),
    });
  });
}
