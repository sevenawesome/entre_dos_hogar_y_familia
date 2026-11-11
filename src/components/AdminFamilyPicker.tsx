import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import {
  listManagedFamilies,
  type ManagedFamily,
} from "../services/spark-admin";
import { friendlyError } from "../services/api";
import { useApp } from "../store";
import { matchesRecipient } from "../domain/recipient-search";
import { Button, Field, Notice, colors, s } from "./ui";
export function AdminFamilyPicker({
  onSelect,
  initialOpen = false,
  selectedUid,
  disabled = false,
  closeOnSelect = false,
}: {
  onSelect: (family: ManagedFamily) => void;
  initialOpen?: boolean;
  selectedUid?: string;
  disabled?: boolean;
  closeOnSelect?: boolean;
}) {
  const app = useApp();
  const [open, setOpen] = useState(initialOpen),
    [rows, setRows] = useState<ManagedFamily[]>([]),
    [cursor, setCursor] = useState<QueryDocumentSnapshot>(),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [visibleCount, setVisibleCount] = useState(5);
  async function load(append = false) {
    setBusy(true);
    setError("");
    try {
      if (app.demo && app.family) {
        setRows([
          {
            uid: "demo",
            email: "familia@ejemplo.com",
            family: app.family,
            role: "owner",
            summary: null,
            remindersPaused: false,
          },
          {
            uid: "demo-rivera",
            email: "rivera@ejemplo.com",
            family: {
              ...app.family,
              name: "Familia Rivera",
              partner1: "Elena",
              partner2: "Marcos",
            },
            role: "member",
            summary: null,
            remindersPaused: false,
          },
        ]);
        return;
      }
      // A chooser only needs names/email; detailed administration loads separately after selection.
      const page = await listManagedFamilies(
        append ? cursor : undefined,
        false,
      );
      setRows((old) =>
        append
          ? [
              ...new Map(
                [...old, ...page.rows].map((row) => [row.uid, row]),
              ).values(),
            ]
          : page.rows,
      );
      setCursor(page.cursor);
      setMore(page.hasMore);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (open && !rows.length) void Promise.resolve().then(() => load());
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const found = rows.filter((f) => matchesRecipient(f, search));
  return (
    <View style={{ gap: 12 }}>
      <Button
        secondary
        title={
          open
            ? "Ocultar listado de familias"
            : selectedUid
              ? "Cambiar familia destinataria"
              : "Elegir del listado de familias"
        }
        disabled={disabled}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Field
            label="Buscar por familia, nombre o correo"
            placeholder="Ej.: Rivera, Ana, Pérez o parte del correo"
            value={search}
            editable={!disabled}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) => {
              setSearch(value);
              setVisibleCount(5);
            }}
          />
          <Text style={s.small}>
            {search.trim()
              ? `${found.length} ${found.length === 1 ? "coincidencia" : "coincidencias"} · `
              : ""}
            {rows.length} familias cargadas. Puedes escribir una o varias
            palabras, sin importar tildes o mayúsculas.
          </Text>
          {!!error && <Notice error text={error} />}
          {found.slice(0, visibleCount).map((f) => (
            <Pressable
              key={f.uid}
              accessibilityRole="button"
              accessibilityLabel={`Seleccionar ${f.family.name}`}
              accessibilityState={{
                selected: f.uid === selectedUid,
                disabled: disabled || busy,
              }}
              disabled={disabled || busy}
              onPress={() => {
                if (closeOnSelect) setOpen(false);
                onSelect(f);
              }}
              style={{
                padding: 14,
                borderWidth: 1,
                borderColor: f.uid === selectedUid ? colors.ocean : colors.line,
                borderRadius: 14,
                backgroundColor:
                  f.uid === selectedUid ? colors.sage : colors.cream,
                gap: 5,
              }}
            >
              <Text style={s.label}>
                {f.uid === selectedUid ? "✓ " : ""}
                {f.family.name}
              </Text>
              <Text style={s.small}>
                {f.family.partner1} y {f.family.partner2}
              </Text>
              <Text style={s.small}>
                {f.email || "Sin correo en el resumen"}
              </Text>
            </Pressable>
          ))}
          {found.length > visibleCount && (
            <Button
              secondary
              title={`Ver ${Math.min(10, found.length - visibleCount)} coincidencias más`}
              disabled={disabled || busy}
              onPress={() => setVisibleCount(visibleCount + 10)}
            />
          )}
          {!found.length && !busy && (
            <Notice text="No hay coincidencias entre las familias cargadas. Puedes cargar más o buscar una cuenta por correo debajo." />
          )}
          <Button
            secondary
            title={more ? "Cargar 20 familias más" : "Actualizar listado"}
            busy={busy}
            disabled={disabled}
            onPress={() => load(more)}
          />
          {more && (
            <Text style={s.small}>
              El filtro busca entre las familias cargadas. Carga otras 20 si
              todavía no aparece la que necesitas.
            </Text>
          )}
        </>
      )}
    </View>
  );
}
