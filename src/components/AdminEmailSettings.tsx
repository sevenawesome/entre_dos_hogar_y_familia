import { useState } from "react";
import { Switch, Text, View } from "react-native";
import { useApp } from "../store";
import { hasPermission } from "../domain/admin-permissions";
import { saveOptionalEmailSettings } from "../services/spark-admin";
import { friendlyError } from "../services/api";
import { Button, Card, Field, Notice, s } from "./ui";
export function AdminEmailSettings() {
  const app = useApp(),
    service = app.emailService,
    canSave = !app.demo && hasPermission(app, "settings.manage");
  const [draft, setDraft] = useState(service),
    [daily, setDaily] = useState(String(service.dailyLimit)),
    [monthly, setMonthly] = useState(String(service.monthlyLimit)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  return (
    <Card>
      <Text style={s.sectionTitle}>Remitente, límites y mensajes</Text>
      <Notice
        text={
          service.enabled
            ? "Servicio habilitado. Cada familia elige qué correos recibir."
            : "Envío pendiente de activación. Puedes guardar estos ajustes mientras se configuran las cuentas del proveedor."
        }
      />
      <Field
        label="Nombre del remitente"
        value={draft.fromName}
        onChangeText={(fromName) => setDraft({ ...draft, fromName })}
        maxLength={80}
      />
      <Field
        label="Correo remitente del dominio verificado"
        value={draft.fromEmail}
        onChangeText={(fromEmail) =>
          setDraft({ ...draft, fromEmail: fromEmail.trim() })
        }
        placeholder="avisos@tu-dominio.com"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <Text style={s.small}>
        Dominio autorizado: {service.verifiedSenderDomain || "pendiente"}.
        Puedes cambiar la dirección dentro de ese dominio. Para uno nuevo hay
        que verificarlo en el proveedor. Gmail puede usarse para respuestas,
        pero no como remitente de dominio verificado.
      </Text>
      <Field
        label="Correo para respuestas"
        value={draft.replyTo}
        onChangeText={(replyTo) =>
          setDraft({ ...draft, replyTo: replyTo.trim() })
        }
        autoCapitalize="none"
        keyboardType="email-address"
      />
      {(
        [
          ["paused", "Pausar todos los correos opcionales"],
          ["automaticEnabled", "Enviar resúmenes de retos y celebraciones"],
          ["adminMessagesEnabled", "Permitir mensajes del equipo por correo"],
        ] as const
      ).map(([key, label]) => (
        <View key={key} style={[s.row, { gap: 16 }]}>
          <Text style={[s.body, { flex: 1 }]}>{label}</Text>
          <Switch
            accessibilityLabel={label}
            value={draft[key]}
            disabled={!canSave || busy}
            onValueChange={(value) => setDraft({ ...draft, [key]: value })}
          />
        </View>
      ))}
      <Field
        label="Límite de nuevos correos al día · máximo 90"
        value={daily}
        onChangeText={setDaily}
        keyboardType="number-pad"
        maxLength={2}
      />
      <Field
        label="Límite de nuevos correos al mes · máximo 2700"
        value={monthly}
        onChangeText={setMonthly}
        keyboardType="number-pad"
        maxLength={4}
      />
      <Text style={s.small}>
        Los límites se comparten entre todas las familias. Al agotarse la cuota,
        los mensajes esperan o se omiten si quedan desactualizados. Un envío
        aceptado por el proveedor no confirma que llegó a la bandeja de entrada.
      </Text>
      <Field
        label="Prefijo del asunto · opcional"
        value={draft.subjectPrefix}
        onChangeText={(subjectPrefix) => setDraft({ ...draft, subjectPrefix })}
        maxLength={40}
      />
      {(
        [
          ["birthdayTemplate", "Saludo de cumpleaños · variable {person}"],
          ["anniversaryTemplate", "Saludo de aniversario · variable {years}"],
          [
            "challengeTemplate",
            "Reto pendiente · variables {level} y {challenge}",
          ],
          ["finishTemplate", "Reflexión final · variable {levelTitle}"],
        ] as const
      ).map(([key, label]) => (
        <Field
          key={key}
          label={label}
          value={draft[key]}
          onChangeText={(value) => setDraft({ ...draft, [key]: value })}
          multiline
          maxLength={800}
        />
      ))}
      <Text style={s.small}>
        Las plantillas son texto simple. No incluyen notas ni respuestas
        privadas. Las claves del proveedor se configuran de forma segura en el
        servicio de envío y no se guardan en la app.
      </Text>
      <Button
        title="Guardar configuración de correos"
        busy={busy}
        disabled={!canSave}
        onPress={async () => {
          setBusy(true);
          setError("");
          try {
            await saveOptionalEmailSettings({
              ...draft,
              dailyLimit: Number(daily),
              monthlyLimit: Number(monthly),
            });
            setDraft((old) => ({
              ...old,
              version: old.version + 1,
              dailyLimit: Number(daily),
              monthlyLimit: Number(monthly),
            }));
            setMessage("Configuración de correos guardada.");
          } catch (e) {
            setError(friendlyError(e));
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button
        secondary
        title="Recargar configuración de correos"
        disabled={busy}
        onPress={() => {
          setDraft(service);
          setDaily(String(service.dailyLimit));
          setMonthly(String(service.monthlyLimit));
          setError("");
          setMessage("Cargamos la configuración actual.");
        }}
      />
      {!!error && <Notice error text={error} />}
      {!!message && <Notice text={message} />}
    </Card>
  );
}
