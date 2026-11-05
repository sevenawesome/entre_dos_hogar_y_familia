import { useEffect, useState } from "react";
import { Text, View, Pressable } from "react-native";
import { router } from "expo-router";
import { useApp } from "../../store";
import {
  listManagedFamilies,
  sendFamilyMessage,
  setAccountRole,
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
    [confirmed, setConfirmed] = useState(false);
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
    if (!app.isAdmin) return;
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
    void Promise.resolve().then(() => load());
  }, [app.uid, app.isAdmin, app.demo]); // eslint-disable-line react-hooks/exhaustive-deps
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
        <>
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
            ].map(([key, label]) => (
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
                                ? "Revisar retiro de permiso"
                                : "Revisar permiso de administrador"
                            }
                            onPress={() => {
                              setRoleTarget(r);
                              setConfirmed(false);
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
      {recipient && (
        <Card style={{ backgroundColor: colors.sage }}>
          <Text style={s.sectionTitle}>
            Un mensaje para {recipient.family.name}
          </Text>
          <Notice text="Se guardará en su bandeja. Lo recibirán al abrir o sincronizar la app. Esta versión sin servidor no envía un push remoto inmediato con la app cerrada." />
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
          <Button
            title="Enviar a la bandeja de esta familia"
            disabled={app.demo || !body.trim() || !title.trim()}
            busy={busy}
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                await sendFamilyMessage(recipient.uid, title, body);
                setMessage(`Mensaje guardado para ${recipient.family.name}.`);
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
      {roleTarget && (
        <Card style={{ backgroundColor: colors.blush }}>
          <Text style={s.sectionTitle}>
            {roleTarget.role === "admin" ? "Retirar acceso" : "Conceder acceso"}
            : {roleTarget.family.name}
          </Text>
          <Text style={s.body}>
            Un administrador puede ver perfiles y fechas familiares, revisar
            resúmenes de progreso, enviar mensajes y administrar permisos de
            otras cuentas. Si la pareja comparte esta cuenta, ambos tendrán el
            mismo permiso. Las notas y respuestas siguen privadas.
          </Text>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: confirmed }}
            onPress={() => setConfirmed(!confirmed)}
          >
            <Text style={s.link}>
              {confirmed ? "☑" : "☐"} Confirmo el cambio para esta cuenta
            </Text>
          </Pressable>
          <Button
            title="Aplicar cambio de permiso"
            disabled={app.demo || !confirmed}
            busy={busy}
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                await setAccountRole(
                  roleTarget.uid,
                  roleTarget.role === "admin" ? "member" : "admin",
                );
                setRoleTarget(null);
                setMessage(
                  "Permiso actualizado. Las reglas verifican el rol en cada operación.",
                );
                await load();
              } catch (e) {
                setError(friendlyError(e));
              } finally {
                setBusy(false);
              }
            }}
          />
          <Button
            secondary
            title="Cancelar cambio"
            onPress={() => setRoleTarget(null)}
          />
        </Card>
      )}
      {!recipient && !roleTarget && (
        <Card>
          <Text style={s.sectionTitle}>La app y sus próximos capítulos</Text>
          <Button
            secondary
            title="Configurar mensajes, niveles y perfiles"
            onPress={() => router.push("/admin")}
          />
          <Text style={s.small}>
            Los datos de esta sección son privados para la administración. Se
            cargan por páginas para cuidar el consumo de Firebase Spark.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
