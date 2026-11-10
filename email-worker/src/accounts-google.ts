import {
  accessToken,
  googleRepository,
  type Env,
  type Repository,
} from "./google";
export interface AuthAccount {
  uid: string;
  email: string;
  verified: boolean;
  disabled: boolean;
  validSince: number;
}
export interface AccountsRepository extends Repository {
  canDeleteAccounts(): Promise<boolean>;
  listAccounts(
    cursor?: string,
    size?: number,
  ): Promise<{ accounts: AuthAccount[]; cursor: string | null }>;
  accountInfo(uid: string): Promise<AuthAccount | null>;
  deleteAuth(uid: string): Promise<void>;
  removeDocuments(
    paths: { path: string; version?: string }[],
  ): Promise<boolean>;
}
export async function accountsRepository(
  env: Env,
  fetcher = fetch,
): Promise<AccountsRepository> {
  const repo = await googleRepository(env, fetcher),
    token = await accessToken(env, fetcher);
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
  const authBase = `https://identitytoolkit.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/accounts`;
  const root = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const decode = (u: Record<string, unknown>): AuthAccount => ({
    uid: String(u.localId),
    email: String(u.email ?? ""),
    verified: u.emailVerified === true,
    disabled: u.disabled === true,
    validSince: Number(u.validSince ?? 0),
  });
  return {
    ...repo,
    async canDeleteAccounts() {
      const r = await fetcher(
        `https://cloudresourcemanager.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}:testIamPermissions`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ permissions: ["firebaseauth.users.delete"] }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!r.ok) return false;
      const data = await r.json();
      return data.permissions?.includes("firebaseauth.users.delete") === true;
    },
    async listAccounts(cursor = "", size = 10) {
      const url = new URL(authBase + ":batchGet");
      url.searchParams.set("maxResults", String(size));
      if (cursor) url.searchParams.set("nextPageToken", cursor);
      url.searchParams.set(
        "fields",
        "users(localId,email,emailVerified,disabled,validSince),nextPageToken",
      );
      const r = await fetcher(url, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw Error("No se pudo cargar el listado de cuentas.");
      const data = await r.json();
      return {
        accounts: (data.users ?? []).map(decode),
        cursor: data.nextPageToken ?? null,
      };
    },
    async accountInfo(uid) {
      const url = new URL(authBase + ":lookup");
      url.searchParams.set(
        "fields",
        "users(localId,email,emailVerified,disabled,validSince)",
      );
      const r = await fetcher(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ localId: [uid] }),
        signal: AbortSignal.timeout(10000),
      });
      if (!r.ok) throw Error("No se pudo comprobar la cuenta.");
      const data = await r.json();
      return data.users?.[0] ? decode(data.users[0]) : null;
    },
    async deleteAuth(uid) {
      const r = await fetcher(authBase + ":delete", {
        method: "POST",
        headers,
        body: JSON.stringify({ localId: uid }),
        signal: AbortSignal.timeout(10000),
      });
      if (r.ok) return;
      const error = await r.json().catch(() => null);
      if (
        r.status === 400 &&
        String(error?.error?.message).includes("USER_NOT_FOUND")
      )
        return;
      throw Error(
        r.status === 403
          ? "El servicio no tiene permiso para eliminar cuentas de acceso."
          : "No se pudo eliminar el acceso. El proceso se puede reintentar.",
      );
    },
    async removeDocuments(paths) {
      if (!paths.length) return true;
      const r = await fetcher(
        `https://firestore.googleapis.com/v1/${root}:commit`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            writes: paths.map((p) => ({
              delete: `${root}/${p.path}`,
              ...(p.version
                ? { currentDocument: { updateTime: p.version } }
                : {}),
            })),
          }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if ([404, 409, 412].includes(r.status)) return false;
      if (!r.ok)
        throw Error(
          "No se pudo terminar la limpieza. El proceso se puede reanudar.",
        );
      return true;
    },
  };
}
