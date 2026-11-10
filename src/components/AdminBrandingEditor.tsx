import { useState } from "react";
import { Keyboard, Text, View } from "react-native";
import { hasPermission } from "../domain/admin-permissions";
import { actions, store, useApp } from "../store";
import type { BrandingSettings } from "../domain/branding";
import { saveBranding } from "../services/spark-admin";
import { friendlyError } from "../services/api";
import { Brand } from "./Brand";
import { Button, Card, Field, Notice, colors, s } from "./ui";
export function AdminBrandingEditor() {
  const app = useApp(),
    [edited, setEdited] = useState<BrandingSettings | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  // Follow the live settings until the user starts editing. Keep their version
  // while editing so the transaction can detect concurrent administrator edits.
  const draft = edited ?? app.branding;
  const allowed = hasPermission(app, "settings.manage");
  return (
    <Card>
      <Text style={s.sectionTitle}>Texto bajo el logo</Text>
      <Text style={s.body}>
        Personaliza el nombre del departamento o institución. Se muestra en la
        app y los nuevos correos. Déjalo vacío para ocultarlo.
      </Text>
      {app.demo && (
        <Notice text="Estás en demostración. La vista previa cambia, pero no se guarda. Entra con tu cuenta administradora para publicar la firma." />
      )}
      {!app.demo && !allowed && (
        <Notice text="Tu cuenta necesita permiso de configuración para cambiar esta firma." />
      )}
      <Field
        label="Firma o institución · opcional"
        value={draft.byline}
        maxLength={120}
        editable={!busy}
        onChangeText={(byline) => {
          setEdited({ ...draft, byline });
          setMessage("");
          setError("");
        }}
        placeholder="By Departamento de Hogar y Familia"
      />
      <View
        style={{
          backgroundColor: colors.cream,
          borderRadius: 18,
          padding: 16,
          gap: 8,
        }}
      >
        <Text style={s.small}>Vista previa</Text>
        <Brand byline={draft.byline} />
      </View>
      {!!error && <Notice error text={error} />}
      {!!message && (
        <View accessibilityLiveRegion="polite">
          <Notice text={message} />
        </View>
      )}
      <Button
        title="Guardar texto bajo el logo"
        busy={busy}
        disabled={app.demo || !allowed}
        onPress={async () => {
          Keyboard.dismiss();
          setBusy(true);
          setError("");
          setMessage("");
          try {
            const saved = await saveBranding(draft);
            store.dispatch(actions.branding(saved));
            setEdited(null);
            setMessage("Texto actualizado para la app y los nuevos correos.");
          } catch (e) {
            setError(friendlyError(e));
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button
        secondary
        title="Recargar texto de la marca"
        disabled={busy}
        onPress={() => {
          setEdited(null);
          setError("");
          setMessage("");
        }}
      />
    </Card>
  );
}
