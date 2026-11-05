import { useState } from "react";
import { Text, View, Switch } from "react-native";
import { router } from "expo-router";
import { useApp } from "../store";
import { familyMembers, PERSON_PHOTO_LIMIT } from "../domain/people";
import { pickPhoto, savePersonPortrait } from "../services/photos";
import { friendlyError } from "../services/api";
import type { PersonPortrait } from "../domain/types";
import { Card, Button, Notice, s, colors } from "./ui";
import { PhotoViewer } from "./PhotoViewer";
export function FamilyPortraits() {
  const { family, portraits, communityProfile, demo } = useApp();
  const [busy, setBusy] = useState<string | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  if (!family) return null;
  async function save(
    key: string,
    patch: Partial<PersonPortrait>,
    pick = false,
  ) {
    setBusy(key);
    setError("");
    setMessage("");
    try {
      if (pick) {
        const photo = await pickPhoto(160, PERSON_PHOTO_LIMIT);
        if (!photo) return;
        patch = { dataUri: photo };
      }
      await savePersonPortrait(key, patch);
      setMessage("Guardamos la foto y las preferencias de esa persona.");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(null);
    }
  }
  return (
    <Card>
      <Text style={s.sectionTitle}>Cada persona, su foto</Text>
      <Text style={s.body}>
        Agreguen fotos de ambos integrantes y de sus hijos para reconocer a
        quien cumple años. Las fotos individuales permanecen en su cuenta
        familiar hasta que elijan compartir un cumpleaños.
      </Text>
      {demo && (
        <Notice text="Fotos de demostración: solo se guardan en este dispositivo." />
      )}
      {familyMembers(family).map((person) => {
        const pref = portraits[person.key] ?? {
          dataUri: null,
          shareBirthday: false,
        };
        return (
          <View
            key={person.key}
            style={{
              gap: 12,
              borderTopWidth: 1,
              borderTopColor: colors.line,
              paddingTop: 18,
            }}
          >
            <View style={[s.row, { gap: 16 }]}>
              <PhotoViewer uri={pref.dataUri} name={person.name} size={80} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.label}>{person.name}</Text>
                <Text style={s.small}>{person.kind}</Text>
              </View>
            </View>
            <Button
              secondary
              title={
                pref.dataUri
                  ? `Cambiar foto de ${person.name}`
                  : `Agregar foto de ${person.name}`
              }
              busy={busy === person.key}
              disabled={!!busy}
              onPress={() => save(person.key, {}, true)}
            />
            {!!pref.dataUri && (
              <Button
                secondary
                title={`Quitar foto de ${person.name}`}
                disabled={!!busy}
                onPress={() => save(person.key, { dataUri: null })}
              />
            )}
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={[s.body, { flex: 1 }]}>
                Mostrar su cumpleaños en Comunidad
              </Text>
              <Switch
                accessibilityLabel={`Compartir cumpleaños de ${person.name} en Comunidad`}
                disabled={
                  !!busy || !communityProfile?.visible || !person.birthDate
                }
                value={pref.shareBirthday}
                onValueChange={(shareBirthday) =>
                  save(person.key, { shareBirthday })
                }
              />
            </View>
            <Text style={s.small}>
              {!person.birthDate
                ? "Agreguen su cumpleaños en los datos familiares para compartirlo."
                : !communityProfile?.visible
                  ? "Activen su participación en Comunidad arriba para habilitar esta opción."
                  : "Al activarlo se comparten su nombre, foto, día y mes. El año de nacimiento y su edad no se publican. Pueden retirarlo en cualquier momento."}
            </Text>
          </View>
        );
      })}
      <Button
        secondary
        title="Editar cumpleaños y familia"
        onPress={() =>
          router.push({
            pathname: "/(tabs)/family",
            params: { edit: "birthdays" },
          })
        }
      />
      {!!error && <Notice error text={error} />}
      {!!message && <Notice text={message} />}
    </Card>
  );
}
