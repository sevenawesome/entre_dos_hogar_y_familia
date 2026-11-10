import { auth } from "./firebase";
export interface AccountRow {
  uid: string;
  email: string;
  name: string;
  protected: boolean;
}
export interface DeletionStatus {
  id: string;
  total: number;
  processed: number;
  deleted: number;
  skipped: number;
  state: "preview" | "queued" | "complete" | "blocked";
  confirmation: string;
  error: string | null;
}
export interface DeletionPreview {
  job: DeletionStatus;
  sample: { uid: string; email: string }[];
  protectedCount: number;
}
const base =
  "https://entre-dos-correo.sevenawesome-srl.workers.dev/admin/accounts";
export async function accountsCall<T>(path = "", body?: unknown): Promise<T> {
  const user = auth?.currentUser;
  if (!user) throw Error("Inicia sesión como propietario.");
  const token = await user.getIdToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const result = await fetch(base + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: controller.signal,
    });
    const data = await result.json();
    if (!result.ok)
      throw Error(data.error ?? "No se pudo completar la solicitud.");
    return data;
  } finally {
    clearTimeout(timer);
  }
}
