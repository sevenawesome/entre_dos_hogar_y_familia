import { hasPermission } from "../../domain/admin-permissions";
import { AdminPermissionsEditor } from "../../components/AdminPermissionsEditor";
import { useEffect, useState } from "react";
import { Text, View, Pressable, Switch } from "react-native";
import { router } from "expo-router";
import { useApp } from "../../store";
import {
  listManagedFamilies,
  sendFamilyMessage,
  pauseOptionalEmails,
  type ManagedFamily,
} from "../../services/spark-admin";
import { friendlyError } from "../../services/api";
import { getAnniversary } from "../../domain/anniversary";
import { getFamilyBirthdays } from "../../domain/birthdays";
import { supportStatus, summaryFromProgress } from "../../domain/community";
import { useNow } from "../../components/useNow";
import { Avatar } from "../../components/Avatar";
import {
  Screen,
  Heading,
  Card,
  Button,
  Field,
  Notice,
  Ring,
  colors,
  s,
} from "../../components/ui";
import type { QueryDocumentSnapshot } from "firebase/firestore";
export default function Administration() {
  const app = useApp(),
    now = useNow();
  const canView = app.demo || hasPermission(app, "families.view"),
    canMessages = app.demo || hasPermission(app, "messages.send"),
    canRoles = app.demo || hasPermission(app, "roles.manage"),
    canSettings = app.demo || hasPermission(app, "settings.manage");
  const [rows, setRows] = useState<ManagedFamily[]>([]),
    [cursor, setCursor] = useState<QueryDocumentSnapshot>(),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [section, setSection] = useState("families"),
    [recipient, setRecipient] = useState<ManagedFamily | null>(null),
    [title, setTitle] = useState("Un paso a la vez, juntos"),
    [body, setBody] = useState(""),
    [roleTarget, setRoleTarget] = useState<ManagedFamily | null>(null),
    [byEmail, setByEmail] = useState(false);
  async function load(append = false) {
    if (app.demo && app.family) {
      const base = summaryFromProgress("demo", app.family.name, app.progress);
      setRows([
        {
          uid: "demo",
          family: app.family,
          email: "cuenta-demo@ejemplo.com",
          role: "owner",
          summary: {
            ...base,
            joinedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
            lastCompletedAt: base.lastCompletedAt,
          },
          remindersPaused: false,
        },
        {
          uid: "demo-rivera",
          email: "rivera@ejemplo.com",
          role: "member",
          family: {
            ...app.family,
            name: "Familia Rivera",
            partner1: "Elena",
            partner2: "Marcos",
            marriageDate: "2001-11-08",
            children: [],
          },
          summary: {
            ...base,
            uid: "demo-rivera",
            familyName: "Familia Rivera",
            completedCount: 18,
            totalCompleted: 18,
            levelOrder: 1,
            levelId: app.levels[0]?.id ?? "nivel-1",
            lastCompletedAt: new Date(Date.now() - 9 * 86400000).toISOString(),
          },
          remindersPaused: false,
        },
      ]);
      return;
    }
    if (!app.isAdmin || !canView) {
      setRows([]);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const page = await listManagedFamilies(append ? cursor : undefined);
      setRows((old) => (append ? [...old, ...page.rows] : page.rows));
      setCursor(page.cursor);
      setMore(page.hasMore);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void Promise.resolve().then(() => {
      if (!canMessages) setRecipient(null);
      if (!canRoles) {
        setRoleTarget(null);
        setSection((old) => (old === "roles" ? "families" : old));
      }
      return load();
    });
  }, [app.uid, app.isAdmin, app.demo, app.permissions]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!app.isAdmin && !app.demo)
    return (
      <Screen>
        <Heading title="Administración" />
        <Notice text="Esta sección requiere un permiso administrativo activo." />
      </Screen>
    );
  const awaiting = rows.filter(
    (r) =>
      r.summary &&
      r.summary.finishedCount < app.levels.length &&
      supportStatus(r.summary, now).needsSupport,
  );
  const events = rows
    .flatMap((r) => {
      const anniversary = getAnniversary(
        r.family.marriageDate,
        r.family.timezone,
        now,
      );
      return [
        ...(anniversary
          ? [
              {
                key: `${r.uid}-anniversary`,
                uid: r.uid,
                family: r.family.name,
                days: anniversary.daysRemaining,
                text: `${anniversary.years} años de matrimonio`,
                kind: "Aniversario",
              },
            ]
          : []),
        ...getFamilyBirthdays(r.family, now).map((b) => ({
          key: `${r.uid}-${b.key}`,
          uid: r.uid,
          family: r.family.name,
          days: b.daysRemaining,
          text: `${b.name} · ${b.nextAge} años`,
          kind: "Cumpleaños",
        })),
      ];
    })
    .filter((e) => e.days <= 30)
    .sort((a, b) => a.days - b.days);
  const shown = section === "support" ? awaiting : rows;
  return (
    <Screen
      key={
        recipient
          ? `message-${recipient.uid}`
          : roleTarget
            ? `role-${roleTarget.uid}`
            : "overview"
      }
    >
      <Heading
        eyebrow="DEPARTAMENTO DE HOGAR Y FAMILIA"
        title={
          recipient
            ? "Un mensaje de ánimo"
            : roleTarget
              ? "Permisos de la cuenta"
              : "Acompañar familias"
        }
        subtitle="Ver sus pasos, celebrar sus fechas y acercarse con un mensaje de ánimo."
      />
      {app.demo && (
        <Notice text="Vista de ejemplo · datos ficticios y acciones de solo lectura. No se contacta a ninguna familia." />
      )}
      {!!error && <Notice error text={error} />}
      {!!message && <Notice text={message} />}
      {!recipient && !roleTarget && (
        <Card style={{ backgroundColor: colors.lavender }}>
          <Text style={s.sectionTitle}>Administrar ENTRE DOS</Text>
          <Text style={s.body}>
            {canRoles
              ? "Elige qué puede ver o cambiar cada administrador y configura la app desde aquí."
              : "Abre las secciones de configuración disponibles para tu cuenta."}
          </Text>
          {canRoles && (
            <Button
              title="Gestionar permisos"
              onPress={() =>
                router.push({
                  pathname: "/admin",
                  params: { section: "roles" },
                })
              }
            />
          )}
          <Button
            secondary
            title="Abrir centro de configuración"
            onPress={() => router.push("/admin")}
          />
        </Card>
      )}
      {!recipient && !roleTarget && canView && (
        <>
          <Card>
            <Text style={s.sectionTitle}>Correos opcionales</Text>
            <Text style={s.body}>
              {app.emailService.enabled
                ? app.emailService.paused
                  ? "Envío pausado."
                  : "Servicio habilitado. Solo reciben correo las familias que lo autorizaron y verificaron su dirección."
                : "Pendiente de configurar el proveedor y activar el envío. La bandeja de la app continúa disponible."}
            </Text>
            <Text style={s.small}>
              Límite configurado: {app.emailService.dailyLimit} al día y{" "}
              {app.emailService.monthlyLimit} al mes. Encolar no confirma
              entrega.
            </Text>
            {app.emailService.enabled && canSettings && (
              <Button
                secondary
                title={
                  app.emailService.paused
                    ? "Reanudar correos opcionales"
                    : "Pausar correos opcionales"
                }
                disabled={app.demo || busy}
                onPress={async () => {
                  setBusy(true);
                  try {
                    await pauseOptionalEmails(!app.emailService.paused);
                  } catch (e) {
                    setError(friendlyError(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            )}
          </Card>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {[
              [String(rows.length), "Familias cargadas"],
              [String(awaiting.length), "Para acompañar"],
              [String(events.length), "Fechas en 30 días"],
            ].map(([value, label]) => (
              <Card
                key={label}
                style={{
                  flex: 1,
                  padding: 12,
                  backgroundColor: colors.lavender,
                }}
              >
                <Text
                  style={{
                    fontSize: 27,
                    color: colors.violet,
                    fontWeight: "700",
                  }}
                >
                  {value}
                </Text>
                <Text style={s.small}>{label}</Text>
              </Card>
            ))}
          </View>
          <View style={{ flexDirection: "row", gap: 7, flexWrap: "wrap" }}>
            {[
              ["families", "Familias"],
              ["dates", "Celebraciones"],
              ["support", "Acompañamiento"],
              ["roles", "Administradores"],
            ]
              .filter(([key]) => key !== "roles" || canRoles)
              .map(([key, label]) => (
                <Pressable
                  accessibilityRole="button"
                  key={key}
                  onPress={() => setSection(key)}
                  style={{
                    padding: 12,
                    borderRadius: 14,
                    backgroundColor:
                      section === key ? colors.violet : colors.lavender,
                  }}
                >
                  <Text
                    style={{
                      color: section === key ? "white" : colors.violet,
                      fontWeight: "600",
                    }}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
          </View>
          <Button
            secondary
            title="Actualizar familias"
            busy={busy}
            onPress={() => load()}
          />
          {section === "dates" ? (
            <>
              <Text style={s.small}>
                Próximos 30 días de las familias cargadas. Fechas privadas para
                el equipo administrador, incluidos los cumpleaños familiares que
                hayan registrado.
              </Text>
              {!events.length && (
                <Card>
                  <Text style={s.body}>
                    Todavía no hay celebraciones próximas en esta página.
                  </Text>
                </Card>
              )}
              {events.map((e) => (
                <Card
                  key={e.key}
                  style={{
                    backgroundColor: e.days === 0 ? colors.blush : colors.white,
                  }}
                >
                  <Text style={s.eyebrow}>
                    {e.kind} ·{" "}
                    {e.days === 0
                      ? "¡ES HOY!"
                      : e.days === 1
                        ? "Mañana"
                        : `En ${e.days} días`}
                  </Text>
                  <Text style={s.sectionTitle}>{e.family}</Text>
                  <Text style={s.body}>{e.text}</Text>
                  <Button
                    secondary
                    title="Preparar un saludo"
                    disabled={!canMessages}
                    onPress={() => {
                      setRecipient(rows.find((r) => r.uid === e.uid)!);
                      setBody(
                        `¡Felicidades, ${e.family}! Les deseamos un día lleno de cariño y gratitud.`,
                      );
                    }}
                  />
                </Card>
              ))}
            </>
          ) : (
            <>
              {section === "support" && (
                <Notice text="Siete días o más sin completar un reto desde el último avance o registro. Es una señal para acompañar, no una penalización ni una clasificación pública." />
              )}
              {!shown.length && !busy && (
                <Card>
                  <Text style={s.body}>
                    No hay familias en esta vista. Al registrarse en la app
                    aparecerán aquí.
                  </Text>
                </Card>
              )}
              {shown.map((r) => {
                const status = r.summary
                    ? {
                        ...supportStatus(r.summary, now),
                        needsSupport:
                          r.summary.finishedCount < app.levels.length &&
                          supportStatus(r.summary, now).needsSupport,
                      }
                    : { days: null, needsSupport: false },
                  level = app.levels.find((l) => l.id === r.summary?.levelId),
                  percent = level
                    ? Math.round(
                        (r.summary!.completedCount / level.challenges.length) *
                          100,
                      )
                    : 0;
                return (
                  <Card key={r.uid}>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <Avatar name={r.family.name} size={48} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={s.sectionTitle}>{r.family.name}</Text>
                        <Text style={s.small}>
                          {r.family.partner1} y {r.family.partner2}
                        </Text>
                      </View>
                      {section !== "roles" && (
                        <Ring value={percent} size={64} />
                      )}
                    </View>
                    {section === "roles" ? (
                      <>
                        <Text style={s.body}>
                          {r.role === "owner"
                            ? "Propietario"
                            : r.role === "admin"
                              ? "Administrador"
                              : "Miembro"}
                        </Text>
                        <Text style={s.small}>{r.email || r.uid}</Text>
                        {r.role !== "owner" && r.uid !== app.uid && (
                          <Button
                            secondary
                            title={
                              r.role === "admin"
                                ? "Editar permisos del administrador"
                                : "Revisar permiso de administrador"
                            }
                            onPress={() => {
                              setRoleTarget(r);
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <Text style={s.body}>
                          {r.summary?.levelOrder
                            ? `Nivel ${r.summary.levelOrder} · ${r.summary.completedCount}${level ? `/${level.challenges.length}` : ""} retos`
                            : "Todavía no comenzaron"}
                        </Text>
                        <Text style={s.small}>
                          {r.summary?.totalCompleted ?? 0} retos en total ·{" "}
                          {r.summary?.finishedCount ?? 0} niveles conseguidos
                        </Text>
                        <Text selectable style={s.small}>
                          {r.email} ·{" "}
                          {r.summary?.emailVerified
                            ? "Correo verificado"
                            : "Correo por verificar"}
                        </Text>
                        <Text
                          style={[
                            s.small,
                            {
                              color: status.needsSupport
                                ? colors.rose
                                : colors.muted,
                            },
                          ]}
                        >
                          {status.needsSupport
                            ? `♡ Necesitan acompañamiento · ${status.days} días sin avanzar`
                            : status.days !== null
                              ? `Último avance: hace ${status.days} días`
                              : "Sin avance registrado"}
                        </Text>
                        <Button
                          secondary
                          title="Escribir a esta familia"
                          disabled={!canMessages}
                          onPress={() => {
                            setRecipient(r);
                            setBody("");
                          }}
                        />
                      </>
                    )}
                  </Card>
                );
              })}
            </>
          )}
          {more && (
            <Button
              secondary
              title="Cargar 20 familias más"
              busy={busy}
              onPress={() => load(true)}
            />
          )}
        </>
      )}
      {recipient && canMessages && (
        <Card style={{ backgroundColor: colors.sage }}>
          <Text style={s.sectionTitle}>
            Un mensaje para {recipient.family.name}
          </Text>
          <Notice text="Se guardará en su bandeja. Lo recibirán al abrir o sincronizar la app. El aviso por teléfono se presenta al sincronizar; no hay un push remoto inmediato con la app cerrada." />
          <Field
            label="Título del mensaje"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Field
            label="Mensaje de acompañamiento"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={1200}
          />
          <View style={[s.row, { gap: 16 }]}>
            <Text style={[s.body, { flex: 1 }]}>
              Enviar también por correo si la familia lo autorizó
            </Text>
            <Switch
              accessibilityLabel="Enviar también por correo"
              value={byEmail}
              disabled={
                app.demo ||
                !app.emailService.enabled ||
                app.emailService.paused ||
                !app.emailService.adminMessagesEnabled ||
                busy
              }
              onValueChange={setByEmail}
            />
          </View>
          <Text style={s.small}>
            El correo se pone en cola para el siguiente ciclo de envío, sujeto
            al consentimiento y la cuota. No es un push inmediato.
          </Text>
          <Button
            title="Enviar a la bandeja de esta familia"
            disabled={app.demo || !body.trim() || !title.trim()}
            busy={busy}
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                await sendFamilyMessage(recipient.uid, title, body, byEmail);
                setMessage(
                  `Mensaje guardado para ${recipient.family.name}.${byEmail ? " Correo en cola; la entrega no está confirmada." : ""}`,
                );
                setByEmail(false);
                setRecipient(null);
              } catch (e) {
                setError(friendlyError(e));
              } finally {
                setBusy(false);
              }
            }}
          />
          <Button
            secondary
            title="Cerrar mensaje"
            onPress={() => setRecipient(null)}
          />
        </Card>
      )}
      {roleTarget && canRoles && (
        <>
          <AdminPermissionsEditor
            initialQuery={roleTarget.uid}
            onDone={() => {
              setRoleTarget(null);
              void load();
            }}
          />
          <Button
            secondary
            title="Cerrar permisos"
            onPress={() => setRoleTarget(null)}
          />
        </>
      )}
      {!recipient && !roleTarget && (
        <Text style={s.small}>
          Los datos de esta sección son privados para la administración. Se
          cargan por páginas para cuidar el consumo de Firebase Spark.
        </Text>
      )}
    </Screen>
  );
}
