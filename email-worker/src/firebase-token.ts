import { unb64 } from "./google";
export interface FirebaseClaims {
  sub: string;
  auth_time: number;
  email_verified: boolean;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}
let cache: { until: number; keys: JsonWebKey[] } | undefined;
export async function verifyFirebaseToken(
  token: string,
  project: string,
  now = new Date(),
  fetcher = fetch,
): Promise<FirebaseClaims> {
  if (token.length > 12000) throw Error("Sesión inválida.");
  const parts = token.split(".");
  if (parts.length !== 3) throw Error("Sesión inválida.");
  let header: { alg: string; kid: string }, claims: FirebaseClaims;
  try {
    header = JSON.parse(new TextDecoder().decode(unb64(parts[0])));
    claims = JSON.parse(new TextDecoder().decode(unb64(parts[1])));
  } catch {
    throw Error("Sesión inválida.");
  }
  const seconds = now.getTime() / 1000;
  if (
    header.alg !== "RS256" ||
    !header.kid ||
    typeof claims.sub !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(claims.sub) ||
    claims.aud !== project ||
    claims.iss !== `https://securetoken.google.com/${project}` ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= seconds ||
    !Number.isFinite(claims.iat) ||
    claims.iat > seconds ||
    !Number.isFinite(claims.auth_time) ||
    claims.auth_time > seconds ||
    claims.auth_time <= 0
  )
    throw Error("La sesión no es válida o ha vencido.");
  if (
    !cache ||
    cache.until < now.getTime() ||
    !cache.keys.some(
      (k) => (k as JsonWebKey & { kid: string }).kid === header.kid,
    )
  ) {
    const r = await fetcher(
      "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com",
      { signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) throw Error("No se pudo verificar la sesión.");
    const data = await r.json();
    cache = {
      until:
        now.getTime() +
        Math.min(
          3600,
          Number(
            r.headers.get("cache-control")?.match(/max-age=(\d+)/)?.[1] ?? 300,
          ),
        ) *
          1000,
      keys: data.keys ?? [],
    };
  }
  const jwk = cache.keys.find(
    (k) => (k as JsonWebKey & { kid: string }).kid === header.kid,
  );
  if (!jwk) throw Error("Firma de sesión desconocida.");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  if (
    !(await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      unb64(parts[2]).buffer as ArrayBuffer,
      new TextEncoder().encode(parts[0] + "." + parts[1]),
    ))
  )
    throw Error("Firma de sesión inválida.");
  return claims;
}
