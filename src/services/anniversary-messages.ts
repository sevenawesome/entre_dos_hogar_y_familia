import { auth } from "./firebase";
export async function sendAnniversaryMessage(
  recipientUid: string,
  body: string,
) {
  if (!auth?.currentUser) throw Error("Inicia sesión para felicitar.");
  const token = await auth.currentUser.getIdToken(),
    controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 30000);
  try {
    const result = await fetch(
      "https://entre-dos-correo.sevenawesome-srl.workers.dev/community/anniversary-message",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipientUid, body }),
        signal: controller.signal,
      },
    );
    const data = await result.json();
    if (!result.ok)
      throw Error(data.error ?? "No se pudo enviar la felicitación.");
    return data as { ok: boolean; alreadySent: boolean };
  } finally {
    clearTimeout(timer);
  }
}
