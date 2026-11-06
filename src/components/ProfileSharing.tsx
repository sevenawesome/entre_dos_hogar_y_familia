import { useState } from "react";
import { Text, View, Switch } from "react-native";
import { pickPhoto, saveFamilySharing } from "../services/photos";
import { useApp, store, actions } from "../store";
import {
  communityDraft,
  publicProjection,
  AVATAR_LIMIT,
} from "../domain/community";
import { Avatar } from "./Avatar";
import { Card, Button, Field, Notice, s, colors } from "./ui";
import { friendlyError } from "../services/api";
export function ProfileSharing() {
  const { uid, family, demo, avatar, communityProfile, progress, portraits } =
    useApp();
  const initial = communityProfile ?? communityDraft(uid!, family!);
  const [alias, setAlias] = useState(initial.alias),
    [visible, setVisible] = useState(initial.visible),
    [shareAnniversary, setAnniversary] = useState(initial.shareAnniversary),
    [shareProgress, setProgress] = useState(initial.shareProgress);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function save(photo = avatar) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const profile = publicProjection(
        {
          ...initial,
          alias,
          visible,
          shareAnniversary,
          shareProgress,
          avatar: photo,
        },
        family!,
        progress,
        portraits,
      );
      if (demo) {
        store.dispatch(actions.avatar(photo));
        store.dispatch(actions.communityProfile(profile));
      } else {
        await saveFamilySharing(
          { alias, visible, shareAnniversary, shareProgress },
          photo,
        );
      }
      setMessage(
        visible
          ? "Guardamos su perfil y lo que eligieron compartir."
          : "Perfil guardado. Su familia permanece fuera de la comunidad.",
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function choosePhoto() {
    setError("");
    try {
      setBusy(true);
      const photo = await pickPhoto(384, AVATAR_LIMIT);
      if (!photo) return;
      await save(photo);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  const toggle = (
    label: string,
    value: boolean,
    onValueChange: (v: boolean) => void,
  ) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Text style={[s.body, { flex: 1 }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
      />
    </View>
  );
  return (
    <Card>
      <Text style={s.sectionTitle}>Su foto y su lugar en comunidad</Text>
      <View style={{ alignItems: "center", gap: 12 }}>
        <Avatar uri={avatar} name={family!.name} size={84} />
        <Text style={s.small}>
          Una miniatura familiar · sin guardar la foto original
        </Text>
      </View>
      <Button
        secondary
        title="Elegir foto de perfil"
        icon="image-outline"
        busy={busy}
        onPress={choosePhoto}
      />
      {!!avatar && (
        <Button
          secondary
          title="Quitar nuestra foto"
          disabled={busy}
          onPress={() => save(null)}
        />
      )}
      <Text style={s.small}>
        La foto es de la cuenta compartida. Solo aparecerá en comunidad si
        activan la participación. Asegúrense de contar con el consentimiento de
        quienes aparecen.
      </Text>
      {toggle("Participar en la comunidad", visible, setVisible)}
      {visible && (
        <View
          style={{
            gap: 16,
            padding: 14,
            borderRadius: 15,
            backgroundColor: colors.mist,
          }}
        >
          <Field
            label="Nombre público o apodo familiar"
            value={alias}
            onChangeText={setAlias}
            maxLength={60}
          />
          {toggle(
            "Compartir nuestro aniversario y tipo de boda",
            shareAnniversary,
            setAnniversary,
          )}
          {toggle(
            "Compartir retos y niveles conseguidos",
            shareProgress,
            setProgress,
          )}
          <Text style={s.small}>
            Las familias con cuenta podrán ver ese nombre, la foto y los datos
            elegidos. Compartir el aniversario incluye su fecha de matrimonio.
            Los cumpleaños y fotos individuales solo se muestran si los
            autorizan por persona en «Cada persona, su foto». Se publica nombre,
            foto, día y mes; nunca el año de nacimiento. No se comparten
            correos, notas ni cuestionarios.
          </Text>
        </View>
      )}
      {!!error && <Notice error text={error} />}
      {!!message && <Notice text={message} />}
      <Button
        title="Guardar privacidad y perfil"
        busy={busy}
        onPress={() => save()}
      />
    </Card>
  );
}
