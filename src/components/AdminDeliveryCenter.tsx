import { useEffect, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { useApp } from "../store";
import { hasPermission } from "../domain/admin-permissions";
import { callBackend, friendlyError } from "../services/api";
import {
  familyEmailStatus,
  mailUsage,
  sendFamilyEmail,
  sendFamilyMessage,
  setFamilyEmailDelivery,
} from "../services/spark-admin";
import { AdminEmailSettings } from "./AdminEmailSettings";
import { Button, Card, Field, Notice, colors, s } from "./ui";
interface Target {
  uid: string;
  email: string;
  family: { name: string };
}
export function AdminDeliveryCenter({ email = false }: { email?: boolean }) {
  const app = useApp(),
    canSend =
      app.demo || hasPermission(app, email ? "emails.send" : "messages.send"),
    canSettings = app.demo || hasPermission(app, "settings.manage");
  const [selectedSection, setSection] = useState<"send" | "settings">(
      canSend ? "send" : "settings",
    ),
    [query, setQuery] = useState(""),
    [target, setTarget] = useState<Target | null>(null),
    [status, setStatus] = useState({ enabled: true, unsubscribed: false }),
    [title, setTitle] = useState("Un paso a la vez, juntos"),
    [body, setBody] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [usage, setUsage] = useState<{ daily: number; monthly: number } | null>(
      null,
    );
  const section =
    selectedSection === "send" && !canSend
      ? "settings"
      : selectedSection === "settings" && !canSettings
        ? "send"
        : selectedSection;
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
  async function refreshUsage() {
    if (app.demo) {
      setUsage({ daily: 0, monthly: 0 });
      return;
    }
    setUsage(await mailUsage());
  }
  useEffect(() => {
    if (email)
      void Promise.resolve()
        .then(refreshUsage)
        .catch((e) => setError(friendlyError(e)));
  }, [email, app.uid, app.permissions]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View style={{ gap: 16 }}>
      {email && (
        <Card style={{ backgroundColor: colors.mist }}>
          <Text style={s.sectionTitle}>Correos · cuidar cada envío</Text>
          <Text style={s.body}>
            {!app.emailService.enabled
              ? "Servicio configurado, envío todavía desactivado."
              : app.emailService.paused
                ? "Envío pausado."
                : "Servicio activo."}
          </Text>
          <Text style={s.small}>
            Solo bienvenida, nivel conseguido y mensajes manuales. Los
            recordatorios diarios siguen en el teléfono.
          </Text>
          <Text style={s.label}>
            Reservados hoy (UTC): {usage?.daily ?? "—"}/
            {app.emailService.dailyLimit} · Mes: {usage?.monthly ?? "—"}/
            {app.emailService.monthlyLimit}
          </Text>
          <Text style={s.small}>
            La reserva cuenta un nuevo envío, incluidos intentos pendientes; no
            confirma entrega.
          </Text>
          <Button
            secondary
            title="Actualizar consumo"
            disabled={busy}
            onPress={() => run(refreshUsage)}
          />
        </Card>
      )}
      {email && (
        <View style={[s.row, { flexWrap: "wrap" }]}>
          {(
            [
              ["send", "Enviar correo", canSend],
              ["settings", "Ajustes de correo", canSettings],
            ] as const
          )
            .filter((x) => x[2])
            .map(([key, label]) => (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: section === key }}
                key={key}
                onPress={() => setSection(key)}
                style={{
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor:
                    section === key ? colors.ocean : colors.mist,
                }}
              >
                <Text
                  style={{ color: section === key ? "white" : colors.ocean }}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
        </View>
      )}
      {!!error && <Notice error text={error} />}
      {!!message && <Notice text={message} />}
      {email && section === "settings" && canSettings ? (
        <AdminEmailSettings />
      ) : (
        canSend && (
          <>
            <Card>
              <Text style={s.sectionTitle}>
                {email ? "Correo personalizado" : "Notificación a una familia"}
              </Text>
              <Notice
                text={
                  email
                    ? "Avisos sobre la cuenta y el programa, sin campañas publicitarias. Se enviarán solo a direcciones verificadas, respetando las bajas y la cuota. Encolar no confirma entrega."
                    : "No consume correos. El mensaje queda en su bandeja; el aviso del teléfono se presenta al abrir o sincronizar la app. Esta versión no envía un push remoto inmediato con la app cerrada."
                }
              />
              <Field
                label="Correo de la cuenta o UID"
                value={query}
                onChangeText={(v) => {
                  setQuery(v);
                  setTarget(null);
                  setConfirmed(false);
                }}
                autoCapitalize="none"
              />
              <Button
                title="Buscar destinatario"
                busy={busy}
                disabled={!query.trim()}
                onPress={() =>
                  run(async () => {
                    setTarget(null);
                    setConfirmed(false);
                    if (app.demo) {
                      setTarget({
                        uid: "demo-rivera",
                        email: "familia@ejemplo.com",
                        family: { name: "Familia Rivera" },
                      });
                      setStatus({ enabled: true, unsubscribed: false });
                      return;
                    }
                    const result = await callBackend("adminFindFamily", {
                      query: query.trim(),
                    });
                    const found = result.data as Target;
                    if (email) setStatus(await familyEmailStatus(found.uid));
                    setTarget(found);
                  })
                }
              />
            </Card>
            {target && (
              <Card key={target.uid}>
                <Text style={s.sectionTitle}>{target.family.name}</Text>
                <Text style={s.small}>{target.email}</Text>
                {email && (
                  <>
                    <View style={s.row}>
                      <Text style={[s.body, { flex: 1 }]}>
                        Permitir correos para esta familia
                      </Text>
                      <Switch
                        accessibilityLabel="Permitir correos para esta familia"
                        value={status.enabled && !status.unsubscribed}
                        disabled={app.demo || busy || status.unsubscribed}
                        onValueChange={(enabled) =>
                          run(async () => {
                            await setFamilyEmailDelivery(target.uid, enabled);
                            setStatus(await familyEmailStatus(target.uid));
                          })
                        }
                      />
                    </View>
                    {status.unsubscribed && (
                      <Notice text="La familia solicitó la baja desde un correo. La administración no puede anular esa baja." />
                    )}
                  </>
                )}
                <Field
                  label="Asunto o título"
                  value={title}
                  maxLength={100}
                  onChangeText={(v) => {
                    setTitle(v);
                    setConfirmed(false);
                  }}
                />
                <Field
                  label="Mensaje"
                  value={body}
                  multiline
                  maxLength={1200}
                  onChangeText={(v) => {
                    setBody(v);
                    setConfirmed(false);
                  }}
                />
                {confirmed ? (
                  <>
                    <Notice
                      text={`Para ${target.family.name} (${target.email}) · ${title}\n\n${body}`}
                    />
                    <Button
                      title={
                        email
                          ? "Confirmar y poner correo en cola"
                          : "Confirmar y enviar a su bandeja"
                      }
                      busy={busy}
                      disabled={
                        app.demo ||
                        (email &&
                          (!app.emailService.enabled ||
                            app.emailService.paused ||
                            !app.emailService.adminMessagesEnabled ||
                            !status.enabled ||
                            status.unsubscribed))
                      }
                      onPress={() =>
                        run(async () => {
                          await (email ? sendFamilyEmail : sendFamilyMessage)(
                            target.uid,
                            title,
                            body,
                          );
                          setMessage(
                            email
                              ? "Correo en cola. La aceptación y entrega están pendientes."
                              : "Mensaje guardado en su bandeja.",
                          );
                          setBody("");
                          setConfirmed(false);
                          if (email) await refreshUsage();
                        })
                      }
                    />
                    <Button
                      secondary
                      title="Volver al borrador"
                      disabled={busy}
                      onPress={() => setConfirmed(false)}
                    />
                  </>
                ) : (
                  <Button
                    title={
                      email
                        ? "Revisar correo antes de enviar"
                        : "Revisar notificación"
                    }
                    disabled={!title.trim() || !body.trim() || busy}
                    onPress={() => setConfirmed(true)}
                  />
                )}
              </Card>
            )}
          </>
        )
      )}
    </View>
  );
}
