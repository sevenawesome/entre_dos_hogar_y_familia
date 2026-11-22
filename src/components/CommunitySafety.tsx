import { useState } from "react";
import { Linking, Text } from "react-native";
import {
  communityRules,
  reportReasons,
  type ReportReason,
} from "../domain/community-safety";
import { communityRequest } from "../services/community-safety";
import { friendlyError } from "../services/api";
import { dismissBlockedCommunityNotifications } from "../services/notifications";
import { useApp, store, actions } from "../store";
import { SafetyModal } from "./SafetyModal";
import { Button, Card, Field, Notice, s } from "./ui";

export function CommunitySafetyActions({
  targetUid,
  label,
  targetType = "profile",
  targetId,
  onChanged,
}: {
  targetUid: string;
  label: string;
  targetType?: "profile" | "greeting";
  targetId?: string;
  onChanged?: () => void;
}) {
  const { uid, demo } = useApp();
  const [opened, setOpened] = useState(false),
    [mode, setMode] = useState<"report" | "block" | null>(null),
    [reason, setReason] = useState<ReportReason>("inappropriate"),
    [detail, setDetail] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState("");
  if (!uid || demo || targetUid === uid || !targetUid) return null;
  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (mode === "block") {
        await communityRequest("block", { uid: targetUid, blocked: true });
        const state = store.getState().app;
        if (state.uid !== uid) return;
        store.dispatch(
          actions.communityBlocks([
            ...state.communityBlocks.filter((b) => b.uid !== targetUid),
            { uid: targetUid, label },
          ]),
        );
        void dismissBlockedCommunityNotifications(uid!, targetUid).catch(
          () => {},
        );
        setOpened(false);
        onChanged?.();
      } else {
        await communityRequest("report", {
          targetUid,
          targetType,
          targetId: targetId ?? targetUid,
          reason,
          detail,
        });
        setDone(
          "Reporte recibido. El equipo revisará el contenido; también puedes bloquear esta familia ahora.",
        );
        setMode(null);
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        secondary
        icon="shield-outline"
        title="Reportar o bloquear"
        onPress={() => {
          setOpened(true);
          setMode(null);
          setDone("");
          setError("");
        }}
      />
      {opened && (
        <SafetyModal
          title={`Cuidar la comunidad · ${label}`}
          busy={busy}
          onClose={() => setOpened(false)}
        >
          {!!done && <Notice text={done} />}
          <Button
            secondary
            title="Reportar contenido al equipo"
            onPress={() => {
              setMode("report");
              setError("");
            }}
          />
          <Button
            secondary
            danger
            title="Bloquear esta familia"
            onPress={() => {
              setMode("block");
              setError("");
            }}
          />
          {mode === "report" && (
            <>
              <Text style={s.body}>
                El equipo recibirá una copia del perfil público o de esta
                felicitación, junto al motivo. No compartiremos tu identidad con
                la familia reportada.
              </Text>
              {(Object.entries(reportReasons) as [ReportReason, string][]).map(
                ([key, text]) => (
                  <Button
                    key={key}
                    secondary
                    title={`${reason === key ? "✓ " : ""}${text}`}
                    onPress={() => setReason(key)}
                  />
                ),
              )}
              <Field
                label="Qué ocurrió (opcional)"
                value={detail}
                onChangeText={setDetail}
                multiline
                maxLength={600}
              />
              <Button title="Enviar reporte" busy={busy} onPress={submit} />
            </>
          )}
          {mode === "block" && (
            <>
              <Notice text="Dejarán de ver sus perfiles y felicitaciones. Ninguna de las dos familias podrá enviar nuevas felicitaciones a la otra. Puedes desbloquear desde Comunidad → Compartir. No se avisa a la otra familia." />
              <Button
                danger
                title="Confirmar bloqueo"
                busy={busy}
                onPress={submit}
              />
            </>
          )}
          {!!error && <Notice error text={error} />}
        </SafetyModal>
      )}
    </>
  );
}
export function CommunitySafetyCenter() {
  const { settings, communityBlocks, demo, uid } = useApp();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function unblock(id: string) {
    setBusy(true);
    setError("");
    try {
      await communityRequest("block", { uid: id, blocked: false });
      const state = store.getState().app;
      if (state.uid === uid)
        store.dispatch(
          actions.communityBlocks(
            state.communityBlocks.filter((b) => b.uid !== id),
          ),
        );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Text style={s.sectionTitle}>Una comunidad con respeto</Text>
      {communityRules.map((rule) => (
        <Text key={rule} style={s.small}>
          • {rule}
        </Text>
      ))}
      <Text style={s.label}>Familias que bloquearon</Text>
      {!communityBlocks.length && (
        <Text style={s.small}>No tienen familias bloqueadas.</Text>
      )}
      {communityBlocks.map((block) => (
        <Button
          key={block.uid}
          secondary
          title={`Desbloquear · ${block.label}`}
          busy={busy}
          disabled={demo}
          onPress={() => unblock(block.uid)}
        />
      ))}
      {!!error && <Notice error text={error} />}
      <Text style={s.small}>
        ¿Necesitan ayuda con un reporte o su seguridad? Contacten al equipo:{" "}
        {settings.supportEmail || "sevenawesome.srl@gmail.com"}.
      </Text>
      <Button
        secondary
        title="Contactar al equipo"
        icon="mail-outline"
        onPress={() =>
          Linking.openURL(
            `mailto:${settings.supportEmail || "sevenawesome.srl@gmail.com"}?subject=Comunidad%20-%20Amor%20que%20permanece`,
          )
        }
      />
    </Card>
  );
}
