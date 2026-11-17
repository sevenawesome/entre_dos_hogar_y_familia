import { useState } from "react";
import { Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useApp } from "../store";
import { firebaseConfigured } from "../services/firebase";
import { requestPasswordRecovery } from "../services/account-security";
import { friendlyError } from "../services/api";
import { AccessBackButton } from "../components/AccessBackButton";
import {
  Screen,
  Heading,
  Card,
  Field,
  Button,
  Notice,
  colors,
  s,
} from "../components/ui";

export default function PasswordRecovery() {
  const app = useApp();
  const [email, setEmail] = useState(app.demo ? "" : (app.email ?? ""));
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    setError("");
    const address = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
      setError("Escribe un correo válido para recuperar el acceso.");
      return;
    }
    setBusy(true);
    try {
      await requestPasswordRecovery(address);
      setSent(true);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <AccessBackButton disabled={busy} />
      <View
        style={{
          alignSelf: "flex-start",
          padding: 18,
          borderRadius: 22,
          backgroundColor: colors.loveMist,
        }}
      >
        <Ionicons
          name={sent ? "mail-open-outline" : "key-outline"}
          size={34}
          color={colors.love}
        />
      </View>
      <Heading
        eyebrow="CUIDAMOS SU ACCESO"
        title={sent ? "Revisa tu correo." : "Recuperar contraseña"}
        subtitle={
          sent
            ? "Si la dirección está registrada, recibirás un enlace seguro para elegir una nueva contraseña."
            : "Escribe el correo de su cuenta compartida. Te enviaremos un enlace para volver a su espacio."
        }
      />
      {sent ? (
        <Card>
          <Text style={s.sectionTitle}>Un paso más para volver</Text>
          <Text style={s.body}>
            Revisa también Spam. Abre el correo más reciente, pulsa «Cambiar
            contraseña» y después inicia sesión con la nueva contraseña.
          </Text>
          <Text style={s.body}>
            Su familia, sus fotos y sus retos completados se conservan.
            Recuerden usar la nueva contraseña en ambos teléfonos.
          </Text>
          <Button
            title={app.uid ? "Volver a Nosotros" : "Volver al acceso"}
            onPress={() =>
              router.replace(app.uid ? "/(tabs)/family" : "/welcome")
            }
          />
          <Button
            secondary
            title="Usar otro correo"
            onPress={() => {
              setSent(false);
              setError("");
            }}
          />
        </Card>
      ) : (
        <Card>
          <Field
            label="Correo de la pareja"
            value={email}
            onChangeText={setEmail}
            placeholder="su.correo@ejemplo.com"
            keyboardType="email-address"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            maxLength={150}
          />
          {!!error && <Notice error text={error} />}
          {!firebaseConfigured && (
            <Notice text="La recuperación estará disponible cuando se conecte el servicio de cuentas." />
          )}
          <Button
            title="Enviar enlace de recuperación"
            tone="love"
            icon="mail-outline"
            busy={busy}
            disabled={!firebaseConfigured || app.demo}
            onPress={submit}
          />
          <Text style={s.small}>
            Espera un minuto entre solicitudes. Si recibes varios correos,
            utiliza el enlace más reciente.
          </Text>
        </Card>
      )}
    </Screen>
  );
}
