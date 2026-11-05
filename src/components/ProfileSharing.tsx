import { useState } from "react";
import { Text, View, Switch } from "react-native";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { useApp, store, actions } from "../store";
import { db } from "../services/firebase";
import {
  communityDraft,
  publicProjection,
  AVATAR_LIMIT,
} from "../domain/community";
import { Avatar } from "./Avatar";
import { Card, Button, Field, Notice, s, colors } from "./ui";
import { friendlyError } from "../services/api";
export function ProfileSharing() {
  const { uid, family, demo, avatar, communityProfile, progress } = useApp();
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
      );
      if (demo) {
        store.dispatch(actions.avatar(photo));
        store.dispatch(actions.communityProfile(profile));
      } else {
        const batch = writeBatch(db!);
        batch.set(doc(db!, "avatars", uid!), {
          dataUri: photo,
          updatedAt: serverTimestamp(),
        });
        batch.set(doc(db!, "community", uid!), {
          ...profile,
          updatedAt: serverTimestamp(),
        });
        await batch.commit();
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
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (result.canceled) return;
      setBusy(true);
      const asset = result.assets[0],
        edge = Math.min(asset.width, asset.height);
      const context = ImageManipulator.manipulate(asset.uri);
      context
        .crop({
          originX: Math.round((asset.width - edge) / 2),
          originY: Math.round((asset.height - edge) / 2),
          width: edge,
          height: edge,
        })
        .resize({ width: 192, height: 192 });
      const rendered = await context.renderAsync();
      let photo: string | null = null;
      for (const compress of [0.65, 0.45, 0.25]) {
        const output = await rendered.saveAsync({
          format: SaveFormat.JPEG,
          compress,
          base64: true,
        });
        const data = `data:image/jpeg;base64,${output.base64}`;
        if (output.base64 && data.length <= AVATAR_LIMIT) {
          photo = data;
          break;
        }
      }
      if (!photo)
        throw new Error(
          "La foto sigue siendo demasiado grande. Elige una imagen más sencilla.",
        );
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
            backgroundColor: colors.lavender,
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
            No se comparten correos, cumpleaños, hijos, notas ni cuestionarios.
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
