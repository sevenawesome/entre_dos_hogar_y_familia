import { auth } from "./firebase";
export async function requestAccountDeactivation() {
  const user = auth?.currentUser;
  if (!user) throw Error("Inicia sesión para continuar.");
  const token = await user.getIdToken();
  const response = await fetch(
    "https://entre-dos-correo.sevenawesome-srl.workers.dev/account/deactivate",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(45000),
    },
  );
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error ?? "No se pudo desactivar la cuenta.");
}
