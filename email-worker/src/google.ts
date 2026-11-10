export interface Env {
  FIREBASE_PROJECT_ID: string;
  GOOGLE_SERVICE_ACCOUNT?: string;
  RESEND_API_KEY?: string;
  UNSUBSCRIBE_SECRET?: string;
  PUBLIC_BASE_URL: string;
  FROM_EMAIL: string;
  SEND_ENABLED: string;
  ADMIN_ACCOUNTS_ENABLED?: string;
}
export type Data = Record<string, unknown>;
export interface Document<T = Data> {
  path: string;
  data: T;
  version: string;
}
export interface Write {
  path: string;
  data: Data;
  version: string | null;
}
export interface Filter {
  field: string;
  op: string;
  value: unknown;
}
export interface Repository {
  get<T = Data>(path: string, mask?: string[]): Promise<Document<T> | null>;
  query<T = Data>(
    collection: string,
    filters: Filter[],
    limit: number,
    mask?: string[],
  ): Promise<Document<T>[]>;
  commit(writes: Write[]): Promise<boolean>;
  account(
    uid: string,
  ): Promise<{ email: string; verified: boolean; disabled: boolean } | null>;
}
export const b64 = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
export const unb64 = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
const encode = (s: string) => b64(new TextEncoder().encode(s));
let cached: { key: string; token: string; until: number } | null = null;
export async function accessToken(env: Env, fetcher: typeof fetch) {
  const sa = JSON.parse(env.GOOGLE_SERVICE_ACCOUNT ?? "{}");
  if (
    sa.project_id !== env.FIREBASE_PROJECT_ID ||
    !sa.private_key ||
    !sa.client_email
  )
    throw new Error("Invalid server credentials");
  if (cached && cached.key === sa.client_email && cached.until > Date.now())
    return cached.token;
  const seconds = Math.floor(Date.now() / 1000),
    unsigned =
      encode(
        JSON.stringify({ alg: "RS256", typ: "JWT", kid: sa.private_key_id }),
      ) +
      "." +
      encode(
        JSON.stringify({
          iss: sa.client_email,
          scope: "https://www.googleapis.com/auth/cloud-platform",
          aud: "https://oauth2.googleapis.com/token",
          iat: seconds - 30,
          exp: seconds + 3500,
        }),
      );
  const pem = String(sa.private_key).replace(/-----[^-]+-----|\s/g, "");
  const key = await crypto.subtle.importKey(
    "pkcs8",
    unb64(pem).buffer as ArrayBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const response = await fetcher("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: unsigned + "." + b64(new Uint8Array(signature)),
    }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token)
    throw new Error("Google authentication failed");
  cached = {
    key: sa.client_email,
    token: data.access_token,
    until: Date.now() + 3000000,
  };
  return cached.token;
}
type Value = {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: string;
  doubleValue?: number;
  stringValue?: string;
  timestampValue?: string;
  arrayValue?: { values?: Value[] };
  mapValue?: { fields?: Record<string, Value> };
};
export function toValue(v: unknown): Value {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === "string") return { stringValue: v };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number")
    return Number.isInteger(v)
      ? { integerValue: String(v) }
      : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(v as Data).map(([k, x]) => [k, toValue(x)]),
      ),
    },
  };
}
export function fromValue(v: Value): unknown {
  if ("timestampValue" in v) return new Date(v.timestampValue!);
  if ("stringValue" in v) return v.stringValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("arrayValue" in v) return (v.arrayValue?.values ?? []).map(fromValue);
  if ("mapValue" in v)
    return Object.fromEntries(
      Object.entries(v.mapValue?.fields ?? {}).map(([k, x]) => [
        k,
        fromValue(x),
      ]),
    );
  return null;
}
interface RawDocument {
  name: string;
  fields: Record<string, Value>;
  updateTime: string;
}
export async function googleRepository(
  env: Env,
  fetcher = fetch,
): Promise<Repository> {
  const token = await accessToken(env, fetcher),
    root = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`,
    base = `https://firestore.googleapis.com/v1/${root}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const decode = <T>(raw: RawDocument): Document<T> => ({
    path: raw.name.slice(root.length + 1),
    version: raw.updateTime,
    data: fromValue({ mapValue: { fields: raw.fields } }) as T,
  });
  return {
    async get<T>(path: string, mask?: string[]) {
      const url = new URL(`${base}/${path}`);
      for (const field of mask ?? [])
        url.searchParams.append("mask.fieldPaths", field);
      const response = await fetcher(url, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 404) return null;
      if (!response.ok) throw new Error("Firestore read failed");
      return decode<T>(await response.json());
    },
    async query<T>(
      collection: string,
      filters: Filter[],
      limit: number,
      mask?: string[],
    ) {
      const fieldFilters = filters.map((f) => ({
        fieldFilter: {
          field: { fieldPath: f.field },
          op: f.op,
          value: toValue(f.value),
        },
      }));
      const split = collection.split("/"),
        collectionId = split.pop()!,
        parent = split.length ? `/${split.join("/")}` : "";
      const structuredQuery = {
        from: [{ collectionId }],
        limit,
        ...(mask
          ? { select: { fields: mask.map((fieldPath) => ({ fieldPath })) } }
          : {}),
        ...(filters.length
          ? {
              where:
                fieldFilters.length === 1
                  ? fieldFilters[0]
                  : { compositeFilter: { op: "AND", filters: fieldFilters } },
            }
          : {}),
      };
      const response = await fetcher(`${base}${parent}:runQuery`, {
        method: "POST",
        headers,
        body: JSON.stringify({ structuredQuery }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error("Firestore query failed");
      const rows = await response.json();
      return rows
        .filter((r: { document?: RawDocument }) => r.document)
        .map((r: { document: RawDocument }) => decode<T>(r.document));
    },
    async commit(writes: Write[]) {
      const body = {
        writes: writes.map((w) => ({
          update: {
            name: `${root}/${w.path}`,
            fields: toValue(w.data).mapValue!.fields,
          },
          currentDocument: w.version
            ? { updateTime: w.version }
            : { exists: false },
        })),
      };
      const response = await fetcher(`${base}:commit`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(10000),
      });
      if ([409, 412, 404].includes(response.status)) return false;
      if (!response.ok) throw new Error("Firestore commit failed");
      return true;
    },
    async account(uid: string) {
      const response = await fetcher(
        `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts:lookup`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ localId: [uid] }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!response.ok) throw new Error("Account lookup failed");
      const data = await response.json(),
        u = data.users?.[0];
      return u
        ? {
            email: u.email ?? "",
            verified: u.emailVerified === true,
            disabled: u.disabled === true,
          }
        : null;
    },
  };
}
