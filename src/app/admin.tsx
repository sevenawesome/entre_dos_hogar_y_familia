import { AdminEmailSettings } from "../components/AdminEmailSettings";
import { AdminPermissionsEditor } from "../components/AdminPermissionsEditor";
import { hasPermission } from "../domain/admin-permissions";
import { useEffect, useState } from "react";
import { Text, View, Pressable, Switch } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useApp } from "../store";
import { callBackend, friendlyError } from "../services/api";
import { validateLevel } from "../domain/admin-validation";
import type { AppSettings, Family, Level } from "../domain/types";
import { FamilyForm } from "../components/FamilyForm";
import { AdminJourneyPreview } from "../components/AdminJourneyPreview";
import { bundledLevels } from "../data/catalog";
import {
  Screen,
  Heading,
  Card,
  Button,
  Field,
  Notice,
  colors,
  s,
} from "../components/ui";
interface ManagedFamily {
  uid: string;
  email: string;
  family: Family | null;
  remindersPaused: boolean;
  deviceCount: number;
  progress: { levelId: string; completedCount: number; finished: boolean }[];
}
export default function Admin() {
  const app = useApp();
  const canEdit = app.isAdmin && !app.demo;
  const canSettings = app.demo || hasPermission(app, "settings.manage"),
    canContent = app.demo || hasPermission(app, "content.manage"),
    canFamily = app.demo || hasPermission(app, "families.view"),
    canFamilyEdit = app.demo || hasPermission(app, "families.edit"),
    canRoles = app.demo || hasPermission(app, "roles.manage");
  const [chosenSection, setSection] = useState<
    "app" | "email" | "levels" | "families" | "roles"
  >("app");
  const [settings, setSettings] = useState(app.settings),
    [levels, setLevels] = useState<Level[]>(app.levels),
    [json, setJson] = useState(""),
    [preview, setPreview] = useState<Level | null>(null),
    [confirmed, setConfirmed] = useState(false),
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
        const data = result.data as { settings: AppSettings; levels: Level[] };
        setSettings(data.settings);
        setLevels(data.levels);
      })
      .catch((e) => {
        if (active) setError(friendlyError(e));
      });
    return () => {
      active = false;
    };
  }, [canEdit, app.permissions]);
  const permitted =
    chosenSection === "app" || chosenSection === "email"
      ? canSettings
      : chosenSection === "levels"
        ? canContent
        : chosenSection === "roles"
          ? canRoles
          : canFamily;
  const section = permitted
    ? chosenSection
    : canSettings
      ? "app"
      : canContent
        ? "levels"
        : canRoles
          ? "roles"
          : "families";
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
  function newDraft() {
    const order = Math.max(0, ...levels.map((l) => l.order)) + 1;
    const previous = [...levels]
      .filter((l) => l.published)
      .sort((a, b) => b.order - a.order)[0];
    setPreview(null);
    setConfirmed(false);
    setJson(
      JSON.stringify(
        {
          id: `nivel-${order}`,
          order,
          title: "Título del nuevo nivel",
          subtitle: "Una invitación para seguir creciendo juntos.",
          description: "Reemplaza estos textos con el contenido definitivo.",
          published: false,
          prerequisiteId: previous?.id ?? null,
          challenges: [
            {
              id: "reto-01",
              order: 1,
              title: "Título del primer reto",
              description: "Escribe aquí la actividad completa.",
              reflection: "¿Qué queremos aprender juntos?",
              stage: "Primera etapa",
              minutes: 20,
            },
          ],
          questions: [
            {
              id: "pregunta-1",
              label: "¿Qué queremos conservar de este nivel?",
            },
          ],
        },
        null,
        2,
      ),
    );
  }
  if (!app.isAdmin && !app.demo)
    return (
      <Screen>
        <Heading title="Administración" />
        <Notice text="Este espacio requiere una cuenta con rol de administrador. El propietario asigna el primer acceso por UID en Firestore; después se administra desde la pestaña Admin." />
        <Button secondary title="Volver" onPress={() => router.back()} />
      </Screen>
    );
  return (
    <Screen>
      <Pressable
        accessibilityLabel="Volver"
        onPress={() => router.back()}
        style={[s.row, { minHeight: 40 }]}
      >
        <Ionicons name="arrow-back" size={23} color={colors.ink} />
        <Text style={s.label}>Volver</Text>
      </Pressable>
      <Heading
        eyebrow={
          app.demo ? "VISTA PREVIA · SOLO LECTURA" : "ACCESO DE ADMINISTRADOR"
        }
        title="Centro de configuración"
        subtitle="Ajustes, correos, niveles, perfiles y permisos desde un mismo lugar."
      />
      {app.demo && (
        <Notice text="Esta vista permite revisar la administración. Para guardar cambios reales, activa las reglas y asigna el primer rol propietario al UID de la cuenta en Firestore. La vista previa no modifica datos de otras cuentas." />
      )}
      <View style={[s.row, { flexWrap: "wrap" }]}>
        {(["app", "email", "levels", "families", "roles"] as const)
          .filter((key) =>
            key === "app" || key === "email"
              ? canSettings
              : key === "levels"
                ? canContent
                : key === "roles"
                  ? canRoles
                  : canFamily,
          )
          .map((key) => (
            <Pressable
              accessibilityRole="button"
              key={key}
              onPress={() => {
                setSection(key);
                setError("");
                setMessage("");
              }}
              style={{
                padding: 13,
                borderRadius: 12,
                backgroundColor:
                  section === key ? colors.violet : colors.lavender,
              }}
            >
              <Text
                style={{
                  color: section === key ? "#FFFFFF" : colors.violet,
                  fontWeight: "600",
                }}
              >
                {key === "app"
                  ? "Aplicación"
                  : key === "email"
                    ? "Correos"
                    : key === "roles"
                      ? "Permisos"
                      : key === "levels"
                        ? "Niveles"
                        : "Familias"}
              </Text>
            </Pressable>
          ))}
      </View>
      {!!error && <Notice error text={error} />}
      {!!message && <Notice text={message} />}
      {section === "roles" && canRoles && <AdminPermissionsEditor />}
      {section === "email" && canSettings && <AdminEmailSettings />}
      {!canSettings && !canContent && !canFamily && !canRoles && (
        <Notice text="Todavía no tienes secciones administrativas asignadas. Consulta al propietario." />
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
                setLevels(data.levels);
              })
            }
          />
        </Card>
      )}
      {section === "levels" && canContent && (
        <>
          <Card>
            <Text style={s.sectionTitle}>Catálogo de niveles</Text>
            <Text style={s.body}>
              Puedes preparar borradores y publicar niveles con cantidades
              distintas de retos. Un nivel publicado conserva su recorrido para
              proteger el historial.
            </Text>
            {levels.map((level) => (
              <Pressable
                accessibilityRole="button"
                key={level.id}
                onPress={() => {
                  setJson(JSON.stringify(level, null, 2));
                  setPreview(null);
                  setConfirmed(false);
                }}
                style={[s.row, { paddingVertical: 10 }]}
              >
                <Ionicons
                  name={
                    level.published
                      ? "checkmark-circle-outline"
                      : "create-outline"
                  }
                  size={22}
                  color={colors.violet}
                />
                <Text style={[s.label, { flex: 1 }]}>
                  Nivel {level.order}: {level.title}
                </Text>
                <Text style={s.small}>
                  {level.published ? "Publicado" : "Borrador"}
                </Text>
              </Pressable>
            ))}
            <Button
              secondary
              title="Preparar otro nivel"
              icon="add"
              onPress={newDraft}
            />
            {!levels.some((level) => level.id === bundledLevels[0].id) && (
              <Button
                secondary
                title="Preparar los 30 retos originales del nivel 1"
                onPress={() => {
                  setJson(JSON.stringify(bundledLevels[0], null, 2));
                  setPreview(null);
                  setConfirmed(false);
                }}
              />
            )}
            <Button
              secondary
              title="Cargar catálogo inicial de bodas"
              disabled={!canEdit}
              busy={busy}
              onPress={() =>
                run(async () => {
                  const response = await callBackend(
                    "adminLoadAnniversaries",
                    {},
                  );
                  setMessage(
                    (response.data as { already?: boolean }).already
                      ? "El catálogo ya existe y se conservaron sus cambios."
                      : "Catálogo de bodas guardado en Firebase.",
                  );
                })
              }
            />
          </Card>
          <Card>
            <Text style={s.sectionTitle}>Contenido del capítulo</Text>
            <Text style={s.small}>
              El editor recibe el documento del nivel en JSON, como el catálogo
              del repositorio. Cambia published a true solo cuando hayas
              revisado el contenido. Primero valida para ver el resumen.
            </Text>
            <Field
              label="Documento del nivel"
              value={json}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={(v) => {
                setJson(v);
                setPreview(null);
                setConfirmed(false);
              }}
            />
            <Button
              secondary
              title="Validar y ver resumen"
              onPress={() => {
                setError("");
                try {
                  setPreview(validateLevel(JSON.parse(json)));
                } catch (e) {
                  setPreview(null);
                  setError(
                    e instanceof Error ? e.message : "Revisa el contenido.",
                  );
                }
              }}
            />
            {preview && (
              <>
                <Notice
                  text={`Nivel ${preview.order}: ${preview.title}. ${preview.challenges.length} retos, ${preview.questions.length} preguntas. ${preview.published ? "Se publicará para las familias." : "Quedará como borrador."}`}
                />
                {preview.published && (
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: confirmed }}
                    onPress={() => setConfirmed(!confirmed)}
                    style={s.row}
                  >
                    <Ionicons
                      name={confirmed ? "checkbox" : "square-outline"}
                      size={25}
                      color={colors.rose}
                    />
                    <Text style={[s.body, { flex: 1 }]}>
                      Revisé los retos y las preguntas y quiero publicar este
                      nivel.
                    </Text>
                  </Pressable>
                )}
                <Button
                  title={
                    preview.published ? "Publicar nivel" : "Guardar borrador"
                  }
                  disabled={!canEdit || (preview.published && !confirmed)}
                  busy={busy}
                  onPress={() =>
                    run(async () => {
                      await callBackend("adminSaveLevel", { level: preview });
                      const response = await callBackend("adminBootstrap", {});
                      setLevels((response.data as { levels: Level[] }).levels);
                      setMessage(
                        preview.published
                          ? "Nivel publicado. Las familias lo verán sin actualizar la app."
                          : "Borrador guardado.",
                      );
                    })
                  }
                />
              </>
            )}
          </Card>
        </>
      )}
      {section === "families" && canFamily && (
        <>
          <Card>
            <Text style={s.sectionTitle}>Acompañar una familia</Text>
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
      <AdminJourneyPreview settings={settings} />
    </Screen>
  );
}
