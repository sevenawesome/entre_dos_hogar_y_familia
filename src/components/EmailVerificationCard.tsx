import { useState } from "react";
import { Text, View } from "react-native";
import { useApp } from "../store";
import {
  requestEmailVerification,
  refreshEmailVerification,
} from "../services/email";
import { friendlyError } from "../services/api";
import { Card, Button, Notice, s, colors } from "./ui";
export function EmailVerificationCard() {
  const { email, emailVerified, verificationMessage, demo } = useApp();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!email || demo) return null;
  async function run(send: boolean) {
    setBusy(true);
    setError("");
    try {
      if (send) await requestEmailVerification();
      else await refreshEmailVerification();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card
      style={{ backgroundColor: emailVerified ? colors.sage : colors.mist }}
    >
      <Text style={s.sectionTitle}>Su correo de contacto</Text>
      <Text selectable style={s.body}>
        {email}
      </Text>
      <Text style={s.label}>
        {emailVerified ? "✓ Correo verificado" : "Correo por verificar"}
      </Text>
      {!emailVerified && (
        <View style={{ gap: 12 }}>
          <Text style={s.small}>
            Verifiquen que tienen acceso a este correo. La cuenta y sus retos ya
            están disponibles mientras completan la confirmación.
          </Text>
          <Button
            secondary
            title="Enviar enlace de verificación"
            busy={busy}
            onPress={() => run(true)}
          />
          <Button
            secondary
            title="Ya confirmé mi correo"
            disabled={busy}
            onPress={() => run(false)}
          />
        </View>
      )}
      {!!error && <Notice error text={error} />}
      {!!verificationMessage && !emailVerified && (
        <Notice text={verificationMessage} />
      )}
    </Card>
  );
}
