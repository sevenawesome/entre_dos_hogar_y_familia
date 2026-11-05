import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  sendEmailVerification,
  reload,
  getIdToken,
  type User,
} from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { store, actions } from "../store";
export async function requestEmailVerification(
  user: User | null = auth?.currentUser ?? null,
) {
  if (!user || !auth)
    throw new Error("Inicia sesión para verificar el correo.");
  if (user.emailVerified) return;
  const key = `@entre-dos/verification-sent/${user.uid}`;
  const last = Number(await AsyncStorage.getItem(key));
  if (Date.now() - last < 60000)
    throw new Error(
      "Espera un minuto antes de solicitar otro correo. Revisa también la carpeta de spam.",
    );
  auth.languageCode = "es";
  await sendEmailVerification(user);
  await AsyncStorage.setItem(key, String(Date.now()));
  store.dispatch(
    actions.verificationMessage(
      "Enviamos un enlace de verificación. Ábrelo en tu correo y luego pulsa «Ya confirmé mi correo». Revisa también spam.",
    ),
  );
}
export async function refreshEmailVerification() {
  const user = auth?.currentUser;
  if (!user) throw new Error("Inicia sesión para verificar el correo.");
  await reload(user);
  await getIdToken(user, true);
  if (auth?.currentUser?.uid !== user.uid)
    throw new Error("La sesión cambió. Vuelve a intentarlo.");
  store.dispatch(
    actions.accountEmail({ email: user.email, verified: user.emailVerified }),
  );
  if (user.emailVerified && db) {
    const ref = doc(db, "tracking", user.uid);
    try {
      if ((await getDoc(ref)).exists())
        await updateDoc(ref, {
          emailVerified: true,
          lastActivityAt: serverTimestamp(),
        });
    } catch {
      /* The verified Auth status remains valid if its dashboard summary needs another sync. */
    }
  }
  store.dispatch(
    actions.verificationMessage(
      user.emailVerified
        ? "Tu correo está verificado."
        : "La confirmación todavía no aparece. Abre el enlace que enviamos y vuelve a comprobar.",
    ),
  );
}
export async function syncEmailSummary() {
  const user = auth?.currentUser;
  if (!user || !db) return;
  const ref = doc(db, "tracking", user.uid),
    snap = await getDoc(ref);
  if (snap.exists() && snap.data().emailVerified !== user.emailVerified)
    await updateDoc(ref, {
      emailVerified: user.emailVerified,
      lastActivityAt: serverTimestamp(),
    });
}
