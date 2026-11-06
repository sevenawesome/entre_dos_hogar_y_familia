import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import type { Child, Family } from "../domain/types";
import { Button, Field, Notice, s, colors } from "./ui";
import { updateFamily } from "../services/actions";
import { friendlyError } from "../services/api";
import { displayMarriageDate, parseMarriageDate } from "../domain/anniversary";
import { DateField } from "./DateField";
type ChildDraft = Child & { id: string; birthdayText: string };
const childId = () =>
  `child-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
export function FamilyForm({
  initial,
  onSaved,
  onSave = updateFamily,
}: {
  initial?: Family | null;
  onSaved: () => void;
  onSave?: (family: Family) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? ""),
    [partner1, setPartner1] = useState(initial?.partner1 ?? ""),
    [partner2, setPartner2] = useState(initial?.partner2 ?? ""),
    [partner1Birthday, setPartner1Birthday] = useState(
      displayMarriageDate(initial?.partner1BirthDate),
    ),
    [partner2Birthday, setPartner2Birthday] = useState(
      displayMarriageDate(initial?.partner2BirthDate),
    ),
    [marriageDate, setMarriageDate] = useState(
      displayMarriageDate(initial?.marriageDate),
    ),
    [children, setChildren] = useState<ChildDraft[]>(() =>
      (initial?.children ?? []).map((child) => ({
        ...child,
        id: child.id ?? childId(),
        birthdayText: displayMarriageDate(child.birthDate),
      })),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save() {
    const timezone =
      initial?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
    const parsedMarriageDate = marriageDate.trim()
      ? parseMarriageDate(marriageDate, timezone)
      : null;
    if (!marriageDate.trim()) {
      setError(
        "La fecha de matrimonio es obligatoria para registrar su familia.",
      );
      return;
    }
    const birthdayFields = [
      partner1Birthday,
      partner2Birthday,
      ...children.map((c) => c.birthdayText),
    ];
    if (
      birthdayFields.some(
        (value) => value.trim() && !parseMarriageDate(value, timezone),
      )
    ) {
      setError(
        "Revisa las fechas de cumpleaños. Usa DD/MM/AAAA y fechas válidas que no sean futuras.",
      );
      return;
    }
    if (!parsedMarriageDate) {
      setError(
        "Escribe una fecha de matrimonio válida en formato DD/MM/AAAA. No puede ser una fecha futura.",
      );
      return;
    }
    if (![name, partner1, partner2].every((v) => v.trim())) {
      setError("Completa el nombre de su familia y el de ambos.");
      return;
    }
    if (children.some((c) => !c.name.trim())) {
      setError(
        "Escribe el nombre o apodo de cada hijo o elimina el campo vacío.",
      );
      return;
    }
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        partner1: partner1.trim(),
        partner2: partner2.trim(),
        children: children.map(({ birthdayText, ...child }) => ({
          ...child,
          name: child.name.trim(),
          birthDate: birthdayText.trim()
            ? parseMarriageDate(birthdayText, timezone)
            : null,
        })),
        timezone,
        marriageDate: parsedMarriageDate,
        partner1BirthDate: partner1Birthday.trim()
          ? parseMarriageDate(partner1Birthday, timezone)
          : null,
        partner2BirthDate: partner2Birthday.trim()
          ? parseMarriageDate(partner2Birthday, timezone)
          : null,
      });
      onSaved();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 18 }}>
      <Field
        label="Así se llama nuestra familia"
        value={name}
        onChangeText={setName}
        maxLength={60}
        placeholder="Familia García"
      />
      <Field
        label="Tu nombre"
        value={partner1}
        onChangeText={setPartner1}
        maxLength={40}
        placeholder="¿Cómo te llamas?"
      />
      <Field
        label="El nombre de tu pareja"
        value={partner2}
        onChangeText={setPartner2}
        maxLength={40}
        placeholder="Su nombre o apodo"
      />
      <View
        style={{
          backgroundColor: colors.sage,
          padding: 17,
          borderRadius: 18,
          gap: 14,
        }}
      >
        <Text style={s.label}>Sus cumpleaños · opcional</Text>
        <DateField
          label={`Cumpleaños de ${partner1.trim() || "la primera persona"}`}
          value={partner1Birthday}
          onChange={setPartner1Birthday}
        />
        <DateField
          label={`Cumpleaños de ${partner2.trim() || "tu pareja"}`}
          value={partner2Birthday}
          onChange={setPartner2Birthday}
        />
        <Text style={s.small}>
          El año nos permite mostrar la edad. El equipo administrador puede
          consultar estas fechas para acompañarlos. También son compartidas con
          la cuenta familiar y se usan para sus recordatorios.
        </Text>
      </View>
      <View
        style={{
          gap: 9,
          backgroundColor: colors.mist,
          padding: 17,
          borderRadius: 18,
        }}
      >
        <View style={s.row}>
          <Ionicons name="calendar-outline" size={22} color={colors.ocean} />
          <Text style={[s.label, { flex: 1 }]}>
            El día que empezó su historia
          </Text>
        </View>
        <DateField
          label="Fecha de matrimonio · obligatoria"
          value={marriageDate}
          onChange={setMarriageDate}
        />
        <Text style={s.small}>
          Esta fecha es necesaria para registrar su matrimonio. Verán la cuenta
          regresiva y recibirán un saludo el día de su aniversario al activar
          los recordatorios. Para bodas del 29 de febrero, celebramos el 28 en
          años no bisiestos.
        </Text>
      </View>
      <View style={{ gap: 12 }}>
        <Text style={s.label}>Sus hijos e hijas · opcional</Text>
        <Text style={s.small}>
          Pueden usar apodos y agregar su cumpleaños si desean recordarlo.
        </Text>
        {children.map((child, i) => (
          <View
            key={child.id}
            style={{
              gap: 8,
              padding: 14,
              borderRadius: 15,
              backgroundColor: colors.sage,
            }}
          >
            <View style={s.row}>
              <View style={{ flex: 1 }}>
                <Field
                  label={`Nombre o apodo ${i + 1}`}
                  value={child.name}
                  maxLength={40}
                  onChangeText={(value) =>
                    setChildren(
                      children.map((c, j) =>
                        i === j ? { ...c, name: value } : c,
                      ),
                    )
                  }
                />
              </View>
              <Pressable
                accessibilityLabel={`Quitar hijo ${i + 1}`}
                onPress={() => setChildren(children.filter((_, j) => j !== i))}
                style={{ padding: 12 }}
              >
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            <DateField
              label={`Cumpleaños de ${child.name.trim() || `hijo o hija ${i + 1}`} · opcional`}
              value={child.birthdayText}
              onChange={(value) =>
                setChildren(
                  children.map((c, j) =>
                    j === i ? { ...c, birthdayText: value } : c,
                  ),
                )
              }
            />
            <View style={s.row}>
              {(["hijo", "hija", "otro"] as const).map((kind) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: child.kind === kind }}
                  key={kind}
                  onPress={() =>
                    setChildren(
                      children.map((c, j) => (i === j ? { ...c, kind } : c)),
                    )
                  }
                  style={{
                    padding: 10,
                    backgroundColor:
                      child.kind === kind ? colors.white : "transparent",
                    borderRadius: 9,
                  }}
                >
                  <Text style={s.small}>
                    {kind === "otro"
                      ? "Sin especificar"
                      : kind === "hijo"
                        ? "Hijo"
                        : "Hija"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        {children.length < 10 && (
          <Button
            title="Agregar hijo o hija"
            secondary
            icon="add"
            onPress={() =>
              setChildren([
                ...children,
                { id: childId(), name: "", kind: "hijo", birthdayText: "" },
              ])
            }
          />
        )}
      </View>
      {!!error && <Notice text={error} error />}
      <Button
        title={initial ? "Guardar cambios" : "Crear nuestro espacio"}
        onPress={save}
        busy={busy}
      />
    </View>
  );
}
