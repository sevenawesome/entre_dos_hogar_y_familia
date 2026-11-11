import { hasPermission } from "../../domain/admin-permissions";
import { AdminPermissionsEditor } from "../../components/AdminPermissionsEditor";
import { AdminConfiguration } from "../../components/AdminConfiguration";
import { AdminAccountManagement } from "../../components/AdminAccountManagement";
import { AdminDeliveryCenter } from "../../components/AdminDeliveryCenter";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { AdminWorkspace } from "../../components/AdminWorkspace";
import { adminSections } from "../../domain/admin-navigation";
import { useLocalSearchParams } from "expo-router";
import { useApp } from "../../store";
import {
  listManagedFamilies,
  type ManagedFamily,
} from "../../services/spark-admin";
import { friendlyError } from "../../services/api";
import { localDateISO } from "../../domain/anniversary";
import { familyCelebrations } from "../../domain/celebrations";
import { AdminLevelStudio } from "../../components/AdminLevelStudio";
import { supportStatus, summaryFromProgress } from "../../domain/community";
import { useNow } from "../../components/useNow";
import { Avatar } from "../../components/Avatar";
import {
  Screen,
  Heading,
  Card,
  Button,
  Notice,
  Ring,
  colors,
  s,
} from "../../components/ui";
import type { QueryDocumentSnapshot } from "firebase/firestore";
export default function Administration() {
  const app = useApp(),
    now = useNow(),
    { section: requested } = useLocalSearchParams<{ section?: string }>();
  const canView = app.demo || hasPermission(app, "families.view"),
    canRoles = app.demo || hasPermission(app, "roles.manage");
  const tabs = adminSections.filter(
    (item) =>
      (item.id !== "accounts" || app.role === "owner" || app.demo) &&
      (app.demo ||
        hasPermission(app, item.permission) ||
        (item.id === "emails" && hasPermission(app, "settings.manage"))),
  );
  const current = tabs.find((item) => item.id === requested);
  const section = current?.id;
  const [rows, setRows] = useState<ManagedFamily[]>([]),
    [cursor, setCursor] = useState<QueryDocumentSnapshot>(),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [celebrationKind, setCelebrationKind] = useState("Todas"),
    [celebrationDays, setCelebrationDays] = useState(30);
  async function load(append = false) {
    if (app.demo && app.family) {
      const demoMonthDay = localDateISO(
        app.family.timezone,
        new Date(Date.now() + 5 * 86400000),
      ).slice(5);
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
            marriageDate: `2001-${demoMonthDay}`,
            partner1BirthDate: `1990-${demoMonthDay}`,
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
    void Promise.resolve().then(() => load());
  }, [app.uid, app.isAdmin, app.demo, app.permissions]); // eslint-disable-line react-hooks/exhaustive-deps
  const awaiting = rows.filter(
    (r) =>
      r.summary &&
      r.summary.finishedCount < app.levels.length &&
      supportStatus(r.summary, now).needsSupport,
  );
  const events = rows
    .flatMap((r) => familyCelebrations(r.uid, r.family, now))
    .filter((e) => e.days <= 30)
    .sort((a, b) => a.days - b.days);
  const visibleEvents = rows
    .flatMap((r) => familyCelebrations(r.uid, r.family, now))
    .filter(
      (e) =>
        e.days <= celebrationDays &&
        (celebrationKind === "Todas" || e.kind === celebrationKind),
    )
    .sort((a, b) => a.days - b.days);
  if (!app.isAdmin && !app.demo)
    return (
      <Screen>
        <Heading title="Administración" />
        <Notice text="Esta sección requiere un permiso administrativo activo." />
      </Screen>
    );
  const shown = section === "support" ? awaiting : rows;
  return (
    <AdminWorkspace
      key={section ?? "panel"}
      sections={tabs}
      current={current}
      demo={app.demo}
      counts={
        canView
          ? {
              families: rows.length,
              support: awaiting.length,
              dates: events.length,
            }
          : undefined
      }
    >
      {!!error && <Notice error text={error} />}
      {section === "accounts" && <AdminAccountManagement />}
      {section === "roles" && canRoles && <AdminPermissionsEditor />}
      {section === "notifications" && (
        <AdminDeliveryCenter key="notifications" />
      )}
      {section === "emails" && <AdminDeliveryCenter key="emails" email />}
      {section === "levels" && <AdminLevelStudio />}
      {section === "settings" && <AdminConfiguration section="app" />}
      {section === "families" && canView && (
        <AdminConfiguration section="families" />
      )}
      {canView && ["dates", "support"].includes(section ?? "") && (
        <>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {[
              [rows.length, "Familias cargadas"],
              [awaiting.length, "Para acompañar"],
              [events.length, "Fechas en 30 días"],
            ].map(([value, label]) => (
              <Card
                key={label}
                style={{
                  flex: 1,
                  padding: 12,
                  backgroundColor: colors.mist,
                }}
              >
                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: "700",
                    color: colors.ocean,
                  }}
                >
                  {value}
                </Text>
                <Text style={s.small}>{label}</Text>
              </Card>
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
              <Notice text="Cumpleaños muestra las fechas de nacimiento registradas en Nosotros, incluidos los hijos. Si solo ves aniversarios, revisa que hayan agregado los cumpleaños o amplía el período." />
              <View style={[s.row, { flexWrap: "wrap" }]}>
                {["Todas", "Cumpleaños", "Aniversario"].map((kind) => (
                  <Button
                    key={kind}
                    secondary={celebrationKind !== kind}
                    title={kind}
                    onPress={() => setCelebrationKind(kind)}
                  />
                ))}
              </View>
              <View style={s.row}>
                {[30, 365].map((days) => (
                  <Button
                    key={days}
                    secondary={celebrationDays !== days}
                    title={days === 30 ? "Próximos 30 días" : "Todo el año"}
                    onPress={() => setCelebrationDays(days)}
                  />
                ))}
              </View>
              {!visibleEvents.length && (
                <Notice text="No hay celebraciones de este tipo en el período elegido entre las familias cargadas." />
              )}
              {visibleEvents.map((e) => (
                <Card
                  key={e.key}
                  style={{
                    backgroundColor:
                      e.days === 0 ? colors.champagne : colors.white,
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
                  <Text style={s.body}>{e.current}</Text>
                  <Text style={s.label}>{e.upcoming}</Text>
                </Card>
              ))}
            </>
          ) : (
            <>
              {section === "support" && (
                <Notice text="Siete días o más sin avanzar desde el último reto o registro: una señal para acompañar, sin penalizaciones ni clasificación pública." />
              )}
              {!shown.length && !busy && (
                <Notice text="No hay familias en esta vista." />
              )}
              {shown.map((r) => {
                const level = app.levels.find(
                    (l) => l.id === r.summary?.levelId,
                  ),
                  percent = level
                    ? Math.round(
                        (r.summary!.completedCount / level.challenges.length) *
                          100,
                      )
                    : 0,
                  status = r.summary ? supportStatus(r.summary, now) : null;
                return (
                  <Card key={r.uid}>
                    <View style={s.row}>
                      <Avatar name={r.family.name} size={48} />
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={s.sectionTitle}>{r.family.name}</Text>
                        <Text style={s.small}>
                          {r.family.partner1} y {r.family.partner2}
                        </Text>
                      </View>
                      <Ring value={percent} size={64} />
                    </View>
                    <Text style={s.label}>
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
                    <Text style={s.small}>
                      {status?.days !== null && status?.days !== undefined
                        ? `Último avance: hace ${status.days} días`
                        : "Sin avance registrado"}
                    </Text>
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
          <Text style={s.small}>
            Datos privados para administradores con permiso. Las fechas y cifras
            corresponden a las familias cargadas, por páginas de 20.
          </Text>
        </>
      )}
    </AdminWorkspace>
  );
}
