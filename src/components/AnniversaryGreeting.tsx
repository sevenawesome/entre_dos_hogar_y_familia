import { useState } from "react";
import {
  Modal,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useApp } from "../store";
import type { CommunityProfile } from "../domain/types";
import { sendAnniversaryMessage } from "../services/anniversary-messages";
import { friendlyError } from "../services/api";
import { Card, Button, Field, Notice, s } from "./ui";
export function AnniversaryGreeting({
  profile,
}: {
  profile: CommunityProfile;
}) {
  const app = useApp();
  const [open, setOpen] = useState(false),
    [body, setBody] = useState(""),
    [busy, setBusy] = useState(false),
    [sent, setSent] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <Button
        tone="love"
        title={sent ? "Felicitación enviada" : "Felicitar por su aniversario"}
        disabled={sent}
        onPress={() => setOpen(true)}
      />
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: "#06264ACC",
          }}
        >
          <ScrollView
            style={{ maxHeight: "90%" }}
            keyboardShouldPersistTaps="handled"
          >
            <Card>
              <Text style={s.sectionTitle}>
                Un detalle para {profile.alias}
              </Text>
              <Notice text="Una felicitación por familia y por aniversario. La pareja la recibirá en privado y quedará guardada en sus recuerdos de este aniversario." />
              {!app.demo && !app.communityProfile?.visible && (
                <Notice text="Para felicitar, activen primero su participación en Comunidad desde Nosotros." />
              )}
              {!app.demo && !app.emailVerified && (
                <Notice text="Verifica tu correo desde Nosotros para enviar felicitaciones." />
              )}
              <Text style={s.small}>
                Se enviará como{" "}
                {app.communityProfile?.alias ??
                  app.family?.name ??
                  "su familia"}
                .
              </Text>
              <Field
                label="Su felicitación"
                multiline
                maxLength={1000}
                value={body}
                onChangeText={setBody}
                placeholder="Les deseamos un nuevo año lleno de amor…"
              />
              {!!error && <Notice error text={error} />}
              <Button
                title={
                  app.demo ? "Simular felicitación" : "Enviar felicitación"
                }
                tone="love"
                busy={busy}
                disabled={
                  !body.trim() ||
                  (!app.demo &&
                    (!app.communityProfile?.visible || !app.emailVerified))
                }
                onPress={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    if (!app.demo)
                      await sendAnniversaryMessage(profile.uid, body);
                    setSent(true);
                    setOpen(false);
                  } catch (e) {
                    setError(friendlyError(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              <Button
                secondary
                title="Cancelar"
                disabled={busy}
                onPress={() => setOpen(false)}
              />
              {app.demo && (
                <Text style={s.small}>
                  Demostración: no se guarda ni envía a ninguna familia real.
                </Text>
              )}
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}
