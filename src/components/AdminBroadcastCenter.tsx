import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useApp } from "../store";
import {
  parseBroadcastDraft,
  runBroadcast,
  type BroadcastDraft,
  type BroadcastRecipient,
} from "../domain/broadcast";
import {
  collectiveAudience,
  deliverCollectiveRecipient,
  newBroadcastId,
} from "../services/spark-admin";
import { friendlyError } from "../services/api";
import { pickMessageAttachment } from "../services/attachments";
import type { MessageAttachment } from "../domain/attachments";
import { DeliveryPreviewModal } from "./DeliveryPreviewModal";
import { Button, Card, Field, Notice, colors, s } from "./ui";

export function AdminBroadcastCenter({ email }: { email: boolean }) {
  const app = useApp();
  const channel = email ? "email" : "notification";
  const storageKey = `@entre-dos/broadcast/${app.uid}/${channel}`;
  const alive = useRef(true),
    stopped = useRef(false),
    running = useRef(false);
  const [draft, setDraft] = useState<BroadcastDraft | null>(null);
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false);
  const [recipients, setRecipients] = useState<BroadcastRecipient[]>([]),
    [excluded, setExcluded] = useState(0);
  const [title, setTitle] = useState("Un mensaje para nuestra comunidad"),
    [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [error, setError] = useState(""),
    [review, setReview] = useState(false);
  const blocked = app.demo
    ? "Los envíos de demostración están desactivados."
    : email &&
        (!app.emailService.enabled ||
          app.emailService.paused ||
          !app.emailService.adminMessagesEnabled)
      ? "Activa los mensajes manuales y revisa la pausa del servicio en Ajustes de correo."
      : "";
  useEffect(() => {
    alive.current = true;
    stopped.current = false;
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (raw && alive.current)
          setDraft(parseBroadcastDraft(raw, app.uid!, channel));
      })
      .catch((e) => {
        if (alive.current) setError(friendlyError(e));
      })
      .finally(() => {
        if (alive.current) setReady(true);
      });
    return () => {
      alive.current = false;
      stopped.current = true;
    };
  }, [storageKey, app.uid, channel]);
  async function loadAudience() {
    if (running.current) return;
    running.current = true;
    stopped.current = false;
    setBusy(true);
    setError("");
    try {
      if (app.demo) {
        setRecipients([
          {
            uid: "example",
            name: "Familia de ejemplo",
            email: "ejemplo@ejemplo.com",
          },
        ]);
      } else {
        const result = await collectiveAudience(channel, () => stopped.current);
        if (alive.current) {
          setRecipients(result.recipients);
          setExcluded(result.excluded);
        }
      }
    } catch (e) {
      if (alive.current) setError(friendlyError(e));
    } finally {
      running.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function execute() {
    if (running.current || blocked || !app.uid) return;
    running.current = true;
    stopped.current = false;
    setBusy(true);
    setError("");
    setReview(false);
    try {
      const operation: BroadcastDraft = draft ?? {
        id: newBroadcastId(),
        actor: app.uid,
        channel,
        title: title.trim(),
        body: body.trim(),
        attachments,
        recipients,
        completed: [],
        failures: {},
        createdAt: new Date().toISOString(),
      };
      await runBroadcast(
        operation,
        (recipient) => deliverCollectiveRecipient(operation, recipient.uid),
        async (state) => {
          await AsyncStorage.setItem(storageKey, JSON.stringify(state));
          if (alive.current) setDraft(state);
        },
        () => stopped.current,
      );
    } catch (e) {
      if (alive.current) setError(friendlyError(e));
    } finally {
      running.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function clear() {
    try {
      await AsyncStorage.removeItem(storageKey);
      setDraft(null);
      setRecipients([]);
      setExcluded(0);
      setAttachments([]);
      setError("");
    } catch (e) {
      setError(friendlyError(e));
    }
  }
  const selected = draft?.recipients ?? recipients;
  const remaining = selected.length - (draft?.completed.length ?? 0);
  return (
    <Card style={{ borderColor: colors.ocean, backgroundColor: "#F5FAFA" }}>
      <Text style={s.eyebrow}>
        {email ? "CORREO COLECTIVO" : "NOTIFICACIÓN COLECTIVA"}
      </Text>
      <Text style={s.sectionTitle}>Para todas las familias</Text>
      <Notice
        text={
          email
            ? "Se incluyen solo familias activas con correo verificado y recepción permitida. Se respetan las bajas, la pausa y las cuotas. Los correos se envían gradualmente; pueden quedar pendientes hasta 30 días."
            : "Un mensaje por cuenta familiar. Se guarda en su bandeja y el aviso aparece al abrir o sincronizar la app; no es un push inmediato con la app cerrada."
        }
      />
      {!!error && <Notice error text={error} />}
      {!!blocked && <Notice text={blocked} />}
      {!ready ? (
        <Text style={s.body}>Buscando un envío guardado en este teléfono…</Text>
      ) : draft ? (
        <>
          <Text style={s.label}>{draft.title}</Text>
          <Text style={s.body}>{draft.body}</Text>
          <Text style={s.sectionTitle}>
            {draft.completed.length} de {selected.length}{" "}
            {email ? "en cola" : "en bandeja"}
          </Text>
          <View
            style={{
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.line,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: 8,
                width: `${selected.length ? (draft.completed.length / selected.length) * 100 : 0}%`,
                backgroundColor: colors.ocean,
              }}
            />
          </View>
          <Text style={s.small}>
            El contenido y los destinatarios quedan fijos. Si se interrumpe,
            continúa desde este teléfono sin duplicar lo preparado. Poner en
            cola no confirma entrega.
          </Text>
          {Object.entries(draft.failures)
            .slice(0, 4)
            .map(([uid, reason]) => (
              <Notice
                key={uid}
                text={`${selected.find((r) => r.uid === uid)?.name ?? "Familia"}: ${reason}`}
              />
            ))}
          {busy ? (
            <Button
              secondary
              title="Pausar preparación"
              onPress={() => {
                stopped.current = true;
              }}
            />
          ) : remaining > 0 ? (
            <Button
              title={`Revisar ${remaining} pendientes`}
              disabled={!!blocked}
              onPress={() => setReview(true)}
            />
          ) : (
            <Notice text="Preparación completada. Cada familia tiene una sola copia de este envío." />
          )}
          {!busy && (
            <Button
              secondary
              title={
                remaining
                  ? "Cerrar este envío y preparar otro"
                  : "Preparar otro mensaje"
              }
              onPress={clear}
            />
          )}
          {!busy && remaining > 0 && (
            <Text style={s.small}>
              Cerrar el envío solo quita el borrador local; los mensajes que ya
              se prepararon se conservan.
            </Text>
          )}
        </>
      ) : (
        <>
          <Button
            secondary
            title={
              recipients.length
                ? "Actualizar lista de familias"
                : "Cargar todas las familias destinatarias"
            }
            busy={busy}
            disabled={!ready}
            onPress={loadAudience}
          />
          <Text style={s.label}>
            {selected.length} familias destinatarias
            {email
              ? ` · ${excluded} excluidas por verificación o recepción`
              : ""}
          </Text>
          {!!selected.length && (
            <Text style={s.small}>
              {selected
                .slice(0, 6)
                .map((r) => r.name)
                .join(" · ")}
              {selected.length > 6 ? ` · y ${selected.length - 6} más` : ""}
            </Text>
          )}
          <Field
            label="Asunto o título para todas las familias"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            editable={!busy}
          />
          <Field
            label="Mensaje colectivo"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={1200}
            editable={!busy}
          />
          {attachments.map((item, i) => (
            <View key={i} style={s.row}>
              <Text style={[s.small, { flex: 1 }]}>{item.name}</Text>
              <Button
                secondary
                title="Quitar"
                disabled={busy}
                onPress={() =>
                  setAttachments(attachments.filter((_, n) => n !== i))
                }
              />
            </View>
          ))}
          <Button
            secondary
            title="Adjuntar archivo o foto"
            disabled={busy || attachments.length >= 3}
            onPress={async () => {
              try {
                setError("");
                setAttachments(await pickMessageAttachment(attachments));
              } catch (e) {
                setError(friendlyError(e));
              }
            }}
          />
          <Text style={s.small}>
            Hasta 3 adjuntos y 250 KB en total. Cada copia consume espacio de la
            cuota de Firebase.
          </Text>
          <Button
            title={`Revisar ${email ? "correo" : "notificación"} a todas`}
            disabled={
              busy ||
              !selected.length ||
              !title.trim() ||
              !body.trim() ||
              !!blocked
            }
            onPress={() => setReview(true)}
          />
        </>
      )}
      {review && (
        <DeliveryPreviewModal
          email={email}
          name={`${selected.length} familias${draft ? ` · ${remaining} pendientes` : ""}`}
          title={draft?.title ?? title}
          body={draft?.body ?? body}
          attachments={draft?.attachments ?? attachments}
          reason={blocked}
          confirmationLabel={`Confirmar ${email ? "correos" : "notificaciones"} para ${remaining} familias`}
          recipientSummary={`${selected
            .slice(0, 6)
            .map((r) => r.name)
            .join(
              " · ",
            )}${selected.length > 6 ? ` · y ${selected.length - 6} más` : ""}`}
          onClose={() => setReview(false)}
          onConfirm={execute}
        />
      )}
    </Card>
  );
}
