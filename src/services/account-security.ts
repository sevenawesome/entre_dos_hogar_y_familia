import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "./firebase";
import { store } from "../store";
import { changePasswordForUser, sendRecoveryLink } from "./password-auth";

let requestingRecovery = false;
export async function requestPasswordRecovery(email: string) {
  if (!auth || store.getState().app.demo)
    throw new Error("Usa una cuenta real para recuperar el acceso.");
  if (!email.trim())
    throw new Error("Escribe tu correo para recuperar el acceso.");
  const key = "@entre-dos/password-recovery-sent";
  if (requestingRecovery)
    throw new Error("Ya estamos solicitando el enlace. Espera un momento.");
  requestingRecovery = true;
  try {
    const last = Number(await AsyncStorage.getItem(key));
    if (Date.now() - last < 60000)
      throw new Error(
        "Espera un minuto antes de solicitar otro enlace. Revisa también spam.",
      );
    await sendRecoveryLink(auth, email);
    // Failure to save a local cooldown must not report a successfully sent email as failed.
    await AsyncStorage.setItem(key, String(Date.now())).catch(() => {});
  } finally {
    requestingRecovery = false;
  }
}

export async function changeAccountPassword(
  current: string,
  next: string,
  confirmation: string,
) {
  const user = auth?.currentUser;
  if (!user || store.getState().app.demo)
    throw new Error(
      "Inicia sesión con tu cuenta real para cambiar la contraseña.",
    );
  await changePasswordForUser(
    user,
    current,
    next,
    confirmation,
    () => auth?.currentUser?.uid === user.uid && !store.getState().app.demo,
  );
}
