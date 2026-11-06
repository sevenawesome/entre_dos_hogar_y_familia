import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { useApp } from "../store";
import { saveEmailPreferences } from "../services/email-preferences";
import { friendlyError } from "../services/api";
import { Button, Card, Field, Notice, s } from "./ui";
export function EmailPreferencesCard() {
  const {
    emailPreferences: saved,
    emailService: service,
    emailVerified,
    demo,
  } = useApp();
  const [prefs, setPrefs] = useState(saved),
    [time, setTime] = useState(
      `${String(saved.hour).padStart(2, "0")}:${String(saved.minute).padStart(2, "0")}`,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const available =
    service.enabled && !service.paused && emailVerified && !demo;
  async function save() {
    setError("");
    setMessage("");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      setError("Usa una hora válida, por ejemplo 20:00.");
      return;
    }
    setBusy(true);
    try {
      const [hour, minute] = time.split(":").map(Number);
      await saveEmailPreferences({ ...prefs, hour, minute });
      setMessage(
        prefs.enabled
          ? "Guardamos los correos que desean recibir."
          : "Desactivamos los correos opcionales. Los de acceso a la cuenta siguen disponibles.",
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Card>
      <Text style={s.sectionTitle}>También por correo</Text>
      <Text style={s.body}>
        Elijan si desean recibir recordatorios del reto pendiente, celebraciones
        familiares y mensajes del equipo en el correo compartido. Empiezan
        desactivados.
      </Text>
      {!service.enabled && (
        <Notice text="El envío de correos personalizados está pendiente de activación. Recuperar la contraseña y verificar el correo ya están disponibles." />
      )}
      {service.paused && (
        <Notice text="Los correos opcionales están pausados por el equipo." />
      )}
      {!emailVerified && !demo && (
        <Notice text="Primero confirmen su correo en la tarjeta anterior." />
      )}
      {(
        [
          ["enabled", "Recibir correos opcionales"],
          ["challenges", "Reto pendiente y cierre del nivel"],
          ["celebrations", "Cumpleaños y aniversario"],
          ["adminMessages", "Mensajes del administrador"],
        ] as const
      ).map(([key, label]) => (
        <View
          key={key}
          style={[s.row, { justifyContent: "space-between", gap: 16 }]}
        >
          <Text style={[s.body, { flex: 1 }]}>{label}</Text>
          <Switch
            accessibilityLabel={label}
            value={prefs[key]}
            disabled={
              busy || (!available && (key !== "enabled" || !prefs.enabled))
            }
            onValueChange={(value) => setPrefs({ ...prefs, [key]: value })}
          />
        </View>
      ))}
      <Field
        label="Hora aproximada del correo · 24 horas"
        value={time}
        onChangeText={setTime}
        maxLength={5}
        placeholder="20:00"
        editable={!busy && available}
      />
      <Text style={s.small}>
        Un resumen automático al día, sin saltarse retos. Los mensajes del
        equipo pueden llegar por separado. Dependen de la cuota disponible. Cada
        correo permite darse de baja; también pueden hacerlo aquí. No se
        incluyen notas ni cuestionarios.
      </Text>
      <Button
        secondary
        title="Guardar preferencias de correo"
        busy={busy}
        disabled={demo || (!available && !saved.enabled)}
        onPress={save}
      />
      {!!error && <Notice error text={error} />}
      {!!message && <Notice text={message} />}
    </Card>
  );
}
