import { useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useApp } from "../store";
import { changeAccountPassword } from "../services/account-security";
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

export default function PasswordChange() {
  const { demo, email } = useApp();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    setBusy(true);
    setError("");
    try {
      await changeAccountPassword(current, next, confirmation);
      setCurrent("");
      setNext("");
      setConfirmation("");
      setDone(true);
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
          backgroundColor: colors.sage,
        }}
      >
        <Ionicons
          name={done ? "shield-checkmark-outline" : "lock-closed-outline"}
          size={34}
          color={colors.ocean}
        />
      </View>
      <Heading
        eyebrow="SEGURIDAD DE SU CUENTA"
        title={done ? "Contraseña actualizada." : "Cambiar contraseña"}
        subtitle={
          done
            ? "Su familia y su progreso se conservan. Usen la nueva contraseña en ambos teléfonos cuando se les pida iniciar sesión."
            : "Coordinen este cambio entre los dos: la contraseña pertenece a su cuenta compartida."
        }
      />
      {done ? (
        <Button
          title="Volver a Nosotros"
          onPress={() => router.replace("/(tabs)/family")}
        />
      ) : (
        <Card>
          {!!email && <Text style={s.body}>{email}</Text>}
          <Field
            label="Contraseña actual"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            maxLength={128}
          />
          <Field
            label="Nueva contraseña"
            value={next}
            onChangeText={setNext}
            secureTextEntry
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            maxLength={128}
            placeholder="Al menos 8 caracteres"
          />
          <Field
            label="Confirmar nueva contraseña"
            value={confirmation}
            onChangeText={setConfirmation}
            secureTextEntry
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
            maxLength={128}
          />
          {!!error && <Notice error text={error} />}
          <Button
            title="Guardar nueva contraseña"
            icon="shield-checkmark-outline"
            busy={busy}
            disabled={demo}
            onPress={submit}
          />
          <Button
            secondary
            title="No recuerdo la contraseña actual"
            disabled={busy || demo}
            onPress={() => router.push("/password-recovery")}
          />
        </Card>
      )}
    </Screen>
  );
}
