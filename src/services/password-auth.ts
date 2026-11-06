import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  updatePassword,
  type Auth,
  type User,
} from "firebase/auth";

/** Firebase's hosted email action finishes recovery; never reveal account existence. */
export async function sendRecoveryLink(auth: Auth, email: string) {
  const address = email.trim();
  if (!address) throw new Error("Escribe tu correo para recuperar el acceso.");
  auth.languageCode = "es";
  try {
    await sendPasswordResetEmail(auth, address);
  } catch (error) {
    if ((error as { code?: string }).code !== "auth/user-not-found")
      throw error;
  }
}

export async function changePasswordForUser(
  user: User,
  current: string,
  next: string,
  confirmation: string,
  isCurrent: () => boolean,
) {
  if (!current) throw new Error("Escribe tu contraseña actual.");
  if (next.length < 8 || next.length > 128)
    throw new Error("La nueva contraseña debe tener entre 8 y 128 caracteres.");
  if (next !== confirmation)
    throw new Error("La confirmación no coincide con la nueva contraseña.");
  if (current === next)
    throw new Error("Elige una contraseña distinta de la actual.");
  if (!user.email || !isCurrent())
    throw new Error("Inicia sesión de nuevo para cambiar la contraseña.");
  await reauthenticateWithCredential(
    user,
    EmailAuthProvider.credential(user.email, current),
  );
  if (!isCurrent()) throw new Error("La sesión cambió. Vuelve a intentarlo.");
  await updatePassword(user, next);
}
