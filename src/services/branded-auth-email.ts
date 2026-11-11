import type { User } from "firebase/auth";
/** Returns false to keep Firebase's built-in free service when custom mail is off or full. */
export async function tryBrandedAuthEmail(
  kind: "verification" | "recovery",
  email: string,
  user?: User,
) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    const token = user ? await user.getIdToken() : null;
    const r = await fetch(
      `https://entre-dos-correo.sevenawesome-srl.workers.dev/auth/email/${kind}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email }),
        signal: controller.signal,
      },
    );
    if (!r.ok) return false;
    return (await r.json()).provider === "resend";
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}
