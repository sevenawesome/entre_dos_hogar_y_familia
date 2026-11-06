import { useEffect, useState } from "react";
import { Switch, Text, View, Pressable } from "react-native";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { callBackend, friendlyError } from "../services/api";
import { setAccountRole } from "../services/spark-admin";
import {
  adminPermissions,
  effectivePermissions,
  hasPermission,
  normalizePermissions,
  permissionLabels,
  type AdminPermission,
} from "../domain/admin-permissions";
import { useApp } from "../store";
import { Button, Card, Field, Notice, s } from "./ui";
export function AdminPermissionsEditor({
  initialQuery = "",
  onDone,
}: {
  initialQuery?: string;
  onDone?: () => void;
}) {
  const app = useApp(),
    allowed = app.demo || hasPermission(app, "roles.manage");
  const [query, setQuery] = useState(initialQuery),
    [target, setTarget] = useState<{
      uid: string;
      email: string;
      role: string;
      name: string;
    } | null>(null),
    [selected, setSelected] = useState<AdminPermission[]>(["families.view"]),
    [administrator, setAdministrator] = useState(true),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function lookup(value = query) {
    setBusy(true);
    setError("");
    setConfirmed(false);
    try {
      if (app.demo) {
        setTarget({
          uid: value || "demo-rivera",
          email: "cuenta-demo@ejemplo.com",
          role: "member",
          name: "Familia de ejemplo",
        });
        setSelected(["families.view"]);
        return;
      }
      if (!allowed)
        throw new Error("No tienes permiso para gestionar administradores.");
      const result = await callBackend("adminFindFamily", {
          query: value.trim(),
        }),
        family = result.data as {
          uid: string;
          email: string;
          family: { name: string };
        };
      const role = (await getDoc(doc(db!, "roles", family.uid))).data() ?? {
        role: "member",
      };
      setTarget({
        uid: family.uid,
        email: family.email,
        name: family.family.name,
        role: role.role,
      });
      setAdministrator(role.role !== "member");
      setSelected(
        role.role === "member" ? ["families.view"] : effectivePermissions(role),
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (initialQuery) void Promise.resolve().then(() => lookup(initialQuery));
  }, [initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!allowed)
    return <Notice text="No tienes permiso para gestionar administradores." />;
  const protectedAccount = target?.role === "owner" || target?.uid === app.uid;
  return (
    <Card>
      <Text style={s.sectionTitle}>Permisos de administradores</Text>
      <Text style={s.body}>
        Elige qué puede consultar o cambiar cada cuenta. Los permisos pertenecen
        a la cuenta compartida de la familia.
      </Text>
      <Field
        label="Correo registrado o UID de la cuenta"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />
      <Button
        secondary
        title="Buscar cuenta para permisos"
        busy={busy}
        onPress={() => lookup()}
      />
      {target && (
        <>
          <Text style={s.label}>
            {target.name} · {target.email}
          </Text>
          {protectedAccount && (
            <Notice text="El propietario conserva el acceso completo. Nadie puede cambiar su propio permiso desde este panel." />
          )}
          <View style={[s.row, { gap: 16 }]}>
            <Text style={[s.body, { flex: 1 }]}>
              Esta cuenta es administradora
            </Text>
            <Switch
              accessibilityLabel="Cuenta administradora"
              value={administrator}
              disabled={app.demo || protectedAccount || busy}
              onValueChange={(value) => {
                setAdministrator(value);
                setConfirmed(false);
              }}
            />
          </View>
          {administrator &&
            adminPermissions.map((permission) => (
              <View style={[s.row, { gap: 16 }]} key={permission}>
                <Text style={[s.body, { flex: 1 }]}>
                  {permissionLabels[permission]}
                </Text>
                <Switch
                  accessibilityLabel={permissionLabels[permission]}
                  value={selected.includes(permission)}
                  disabled={
                    app.demo ||
                    protectedAccount ||
                    busy ||
                    !hasPermission(app, permission)
                  }
                  onValueChange={(value) => {
                    setSelected(
                      normalizePermissions(
                        value
                          ? [...selected, permission]
                          : selected.filter((p) => p !== permission),
                      ),
                    );
                    setConfirmed(false);
                  }}
                />
              </View>
            ))}
          <Text style={s.small}>
            Editar perfiles, enviar mensajes y gestionar permisos requieren
            consultar las familias. Solo puedes conceder permisos que tú tienes.
            Las notas y cuestionarios siguen privados.
          </Text>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: confirmed }}
            disabled={app.demo || protectedAccount || busy}
            onPress={() => setConfirmed(!confirmed)}
          >
            <Text style={s.link}>
              {confirmed ? "☑" : "☐"} Confirmo estos permisos para la cuenta
            </Text>
          </Pressable>
          <Button
            title="Guardar permisos de esta cuenta"
            busy={busy}
            disabled={app.demo || protectedAccount || !confirmed}
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                await setAccountRole(
                  target.uid,
                  administrator ? "admin" : "member",
                  selected,
                );
                setMessage(
                  "Permisos guardados. Se aplicarán en los dispositivos de esa cuenta.",
                );
                setConfirmed(false);
                onDone?.();
              } catch (e) {
                setError(friendlyError(e));
              } finally {
                setBusy(false);
              }
            }}
          />
        </>
      )}
      {!!error && <Notice error text={error} />}
      {!!message && <Notice text={message} />}
    </Card>
  );
}
