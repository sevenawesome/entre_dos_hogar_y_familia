import { AdminBrandingEditor } from "./AdminBrandingEditor";
import { AdminFamilyPicker } from "./AdminFamilyPicker";
import { router } from "expo-router";
import { hasPermission } from "../domain/admin-permissions";
import { useEffect, useState } from "react";
import { Text, View, Switch } from "react-native";
import { useApp } from "../store";
import { callBackend, friendlyError } from "../services/api";
import type { AppSettings, Family, Level } from "../domain/types";
import { FamilyForm } from "./FamilyForm";
import { AdminJourneyPreview } from "./AdminJourneyPreview";
import { Card, Button, Field, Notice, s } from "./ui";
interface ManagedFamily {
  uid: string;
  email: string;
  family: Family | null;
  remindersPaused: boolean;
  deviceCount: number;
  progress: { levelId: string; completedCount: number; finished: boolean }[];
}
export function AdminConfiguration({
  section,
}: {
  section: "app" | "families";
}) {
  const app = useApp();
  const canEdit = app.isAdmin && !app.demo;
  const canSettings = app.demo || hasPermission(app, "settings.manage"),
    canFamily = app.demo || hasPermission(app, "families.view"),
    canFamilyEdit = app.demo || hasPermission(app, "families.edit");
  const [settings, setSettings] = useState(app.settings),
    [query, setQuery] = useState(""),
    [target, setTarget] = useState<ManagedFamily | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    if (!canEdit) return;
    let active = true;
    callBackend("adminBootstrap", {})
      .then((result) => {
        if (!active) return;
        const data = result.data as { settings: AppSettings };
        setSettings(data.settings);
      })
      .catch((e) => {
        if (active) setError(friendlyError(e));
      });
    return () => {
      active = false;
    };
  }, [canEdit, app.permissions]);
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 16 }}>
      {!!error && <Notice error text={error} />}
      {!!message && <Notice text={message} />}
      {section === "app" && canSettings && <AdminBrandingEditor />}
      {section === "app" && canSettings && (
        <Button
          secondary
          title="Ver imagen de apertura"
          onPress={() => router.push("/launch-preview")}
        />
      )}
      {section === "app" && canSettings && (
        <Card>
          <Text style={s.sectionTitle}>Mensajes y soporte</Text>
          <Field
            label="Aviso para las familias · opcional"
            multiline
            value={settings.announcement}
            maxLength={800}
            onChangeText={(v) => setSettings({ ...settings, announcement: v })}
          />
          <Field
            label="Título al completar todos los niveles"
            value={settings.endTitle}
            maxLength={100}
            onChangeText={(v) => setSettings({ ...settings, endTitle: v })}
          />
          <Field
            label="Mensaje cuando no queda otro nivel disponible"
            multiline
            value={settings.endMessage}
            maxLength={1200}
            onChangeText={(v) => setSettings({ ...settings, endMessage: v })}
          />
          <Field
            label="Título para anunciar un nuevo nivel"
            value={settings.newLevelTitle}
            maxLength={100}
            onChangeText={(v) => setSettings({ ...settings, newLevelTitle: v })}
          />
          <Field
            label="Correo de soporte · opcional"
            value={settings.supportEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            maxLength={150}
            onChangeText={(v) => setSettings({ ...settings, supportEmail: v })}
          />
          <Field
            label="Página de soporte HTTPS · opcional"
            value={settings.supportUrl}
            autoCapitalize="none"
            maxLength={1000}
            onChangeText={(v) => setSettings({ ...settings, supportUrl: v })}
          />
          <View style={s.row}>
            <Text style={[s.label, { flex: 1 }]}>
              Permitir recordatorios en los teléfonos
            </Text>
            <Switch
              accessibilityLabel="Activar notificaciones globales"
              value={settings.notificationsEnabled}
              onValueChange={(v) =>
                setSettings({ ...settings, notificationsEnabled: v })
              }
            />
          </View>
          <Text style={s.small}>
            Pausar aquí conserva las preferencias de cada teléfono. Los cambios
            se reflejan al recibir la configuración de Firebase.
          </Text>
          <Button
            title="Guardar configuración"
            disabled={!canEdit}
            busy={busy}
            onPress={() =>
              run(async () => {
                const result = await callBackend("adminSaveSettings", {
                  settings,
                });
                setSettings(result.data as AppSettings);
                setMessage("Configuración guardada para las familias.");
              })
            }
          />
          <Button
            secondary
            title="Recargar configuración"
            disabled={!canEdit}
            onPress={() =>
              run(async () => {
                const result = await callBackend("adminBootstrap", {});
                const data = result.data as {
                  settings: AppSettings;
                  levels: Level[];
                };
                setSettings(data.settings);
              })
            }
          />
        </Card>
      )}
      {section === "families" && canFamily && (
        <>
          <Card>
            <Text style={s.sectionTitle}>Seleccionar una familia</Text>
            <AdminFamilyPicker
              initialOpen
              onSelect={(chosen) =>
                run(async () => {
                  setQuery(chosen.email || chosen.uid);
                  if (app.demo) {
                    setTarget({ ...chosen, deviceCount: 0, progress: [] });
                    return;
                  }
                  const result = await callBackend("adminFindFamily", {
                    query: chosen.uid,
                  });
                  setTarget(result.data as ManagedFamily);
                })
              }
            />
            <Text style={s.small}>
              ¿No aparece en el listado? Búscala por su correo registrado o UID.
            </Text>
            <Field
              label="Correo de la cuenta o UID"
              value={query}
              autoCapitalize="none"
              onChangeText={setQuery}
              placeholder="correo@ejemplo.com"
            />
            <Button
              title="Buscar familia"
              disabled={!canEdit || !query.trim()}
              busy={busy}
              onPress={() =>
                run(async () => {
                  const response = await callBackend("adminFindFamily", {
                    query,
                  });
                  setTarget(response.data as ManagedFamily);
                })
              }
            />
            <Text style={s.small}>
              La consulta muestra datos básicos y un resumen del progreso. Las
              notas íntimas y respuestas de los retos no se muestran en este
              panel.
            </Text>
          </Card>
          {target && (
            <>
              <Card>
                <Text style={s.sectionTitle}>{target.email || target.uid}</Text>
                <Text style={s.small}>
                  UID: {target.uid}
                  {"\n"}
                  {target.deviceCount} teléfonos registrados
                </Text>
                {target.progress.map((p) => (
                  <Text style={s.body} key={p.levelId}>
                    {p.levelId}: {p.completedCount} retos ·{" "}
                    {p.finished ? "Conseguido" : "En camino"}
                  </Text>
                ))}
                <Button
                  secondary
                  title={
                    target.remindersPaused
                      ? "Reactivar recordatorios de la familia"
                      : "Pausar recordatorios de la familia"
                  }
                  busy={busy}
                  disabled={!canFamilyEdit || app.demo}
                  onPress={() =>
                    run(async () => {
                      await callBackend("adminSetFamilyReminders", {
                        uid: target.uid,
                        paused: !target.remindersPaused,
                      });
                      setTarget({
                        ...target,
                        remindersPaused: !target.remindersPaused,
                      });
                      setMessage("Preferencia administrativa guardada.");
                    })
                  }
                />
              </Card>
              <Card>
                {canFamilyEdit && (
                  <>
                    <Text style={s.sectionTitle}>Editar perfil familiar</Text>
                    <FamilyForm
                      key={target.uid}
                      initial={target.family}
                      onSave={async (family) => {
                        await callBackend("adminUpdateFamily", {
                          uid: target.uid,
                          family,
                        });
                        setTarget({ ...target, family });
                      }}
                      onSaved={() => setMessage("Perfil familiar actualizado.")}
                    />
                  </>
                )}
              </Card>
            </>
          )}
        </>
      )}
      {section === "app" && <AdminJourneyPreview settings={settings} />}
    </View>
  );
}
