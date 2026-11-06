export const adminPermissions = [
  "families.view",
  "families.edit",
  "messages.send",
  "content.manage",
  "settings.manage",
  "roles.manage",
] as const;
export type AdminPermission = (typeof adminPermissions)[number];
export const permissionLabels: Record<AdminPermission, string> = {
  "families.view": "Consultar familias, progreso y celebraciones",
  "families.edit": "Editar perfiles y pausar recordatorios",
  "messages.send": "Enviar mensajes a familias",
  "content.manage": "Gestionar niveles y catálogo de bodas",
  "settings.manage": "Configurar la aplicación y los correos",
  "roles.manage": "Gestionar permisos de otros administradores",
};
export interface RolePermissions {
  role?: unknown;
  permissions?: unknown;
}
export function effectivePermissions(
  account: RolePermissions,
): AdminPermission[] {
  if (account.role === "owner") return [...adminPermissions];
  if (account.role !== "admin") return [];
  // Preserve existing grants until the owner explicitly edits them.
  if (account.permissions === undefined) return [...adminPermissions];
  return Array.isArray(account.permissions)
    ? adminPermissions.filter((p) =>
        (account.permissions as unknown[]).includes(p),
      )
    : [];
}
export const hasPermission = (
  account: RolePermissions,
  permission: AdminPermission,
) => effectivePermissions(account).includes(permission);
export function normalizePermissions(input: AdminPermission[]) {
  if (input.some((p) => !adminPermissions.includes(p)))
    throw new Error("Permiso desconocido.");
  const selected = new Set(input);
  if (
    input.some((p) =>
      ["families.edit", "messages.send", "roles.manage"].includes(p),
    )
  )
    selected.add("families.view");
  return adminPermissions.filter((p) => selected.has(p));
}
