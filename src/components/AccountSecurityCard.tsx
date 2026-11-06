import { useState } from "react";
import { Text, View } from "react-native";
import { useApp } from "../store";
import {
  changeAccountPassword,
  requestPasswordRecovery,
} from "../services/account-security";
import { friendlyError } from "../services/api";
import { Button, Card, Field, Notice, s } from "./ui";

export function AccountSecurityCard() {
  const { demo, email } = useApp();
  const [editing, setEditing] = useState(false),
    [current, setCurrent] = useState(""),
    [next, setNext] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  function clear() {
    setCurrent("");
    setNext("");
    setConfirmation("");
  }
  async function run(recover: boolean) {
    setError("");
    setMessage("");
    if (demo) {
      setMessage(
        "La demostración no cambia contraseñas ni envía correos. Inicia sesión con tu cuenta para usar esta opción.",
      );
      return;
    }
    setBusy(true);
    try {
      if (recover) {
        await requestPasswordRecovery(email ?? "");
        setMessage(
          "Si el correo está registrado, recibirán un enlace para recuperar el acceso. Revisen también spam.",
        );
      } else {
        await changeAccountPassword(current, next, confirmation);
        clear();
        setEditing(false);
        setMessage(
          "Contraseña actualizada. Usen la nueva contraseña en ambos teléfonos cuando se les pida iniciar sesión. Su familia y progreso se conservan.",
        );
      }
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Text style={s.sectionTitle}>Seguridad de su cuenta</Text>
      <Text style={s.body}>
        La contraseña pertenece a la cuenta compartida. Coordinen el cambio
        entre los dos. No guardamos sus contraseñas en el perfil familiar.
      </Text>
      {demo && (
        <Notice text="Vista de demostración: estas acciones solo funcionan en una cuenta real." />
      )}
      {editing ? (
        <View style={{ gap: 16 }}>
          <Field
            label="Contraseña actual"
            value={current}
            onChangeText={setCurrent}
            secureTextEntry
            autoComplete="current-password"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!busy}
          />
          <Field
            label="Nueva contraseña"
            value={next}
            onChangeText={setNext}
            secureTextEntry
            autoComplete="new-password"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={128}
            editable={!busy}
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
            maxLength={128}
            editable={!busy}
          />
          <Button
            title="Guardar nueva contraseña"
            busy={busy}
            onPress={() => run(false)}
          />
          <Button
            secondary
            title="Cancelar cambio"
            disabled={busy}
            onPress={() => {
              clear();
              setEditing(false);
              setError("");
            }}
          />
        </View>
      ) : (
        <Button
          secondary
          title="Cambiar contraseña"
          disabled={busy}
          onPress={() => {
            setEditing(true);
            setMessage("");
            setError("");
          }}
        />
      )}
      <Button
        secondary
        title="Recuperar contraseña por correo"
        disabled={busy}
        onPress={() => run(true)}
      />
      {!!error && <Notice error text={error} />}
      {!!message && <Notice text={message} />}
    </Card>
  );
}
