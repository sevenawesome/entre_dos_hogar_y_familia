import { auth } from "./firebase";
import type { CommunityProfile } from "../domain/types";
export async function communityRequest<T>(
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const user = auth?.currentUser;
  if (!user) throw Error("Inicia sesión para continuar.");
  const token = await user.getIdToken();
  const response = await fetch(
    `https://entre-dos-correo.sevenawesome-srl.workers.dev/community/${path}`,
    {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(45000),
    },
  );
  const data = await response.json();
  if (!response.ok)
    throw Error(data.error ?? "No se pudo completar la acción de Comunidad.");
  if (auth?.currentUser?.uid !== user.uid)
    throw Error("La sesión cambió. Vuelve a abrir esta pantalla.");
  return data as T;
}
export const loadCommunityPage = (cursor?: string) =>
  communityRequest<{ profiles: CommunityProfile[]; cursor: string | null }>(
    `profiles${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
  );
