import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import {
  listManagedFamilies,
  type ManagedFamily,
} from "../services/spark-admin";
import { friendlyError } from "../services/api";
import { useApp } from "../store";
import { Button, Field, Notice, colors, s } from "./ui";
export function AdminFamilyPicker({
  onSelect,
  initialOpen = false,
}: {
  onSelect: (family: ManagedFamily) => void;
  initialOpen?: boolean;
}) {
  const app = useApp();
  const [open, setOpen] = useState(initialOpen),
    [rows, setRows] = useState<ManagedFamily[]>([]),
    [cursor, setCursor] = useState<QueryDocumentSnapshot>(),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [search, setSearch] = useState("");
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
      const page = await listManagedFamilies(append ? cursor : undefined);
      setRows((old) => (append ? [...old, ...page.rows] : page.rows));
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
  const found = rows.filter((f) =>
    `${f.family.name} ${f.family.partner1} ${f.family.partner2} ${f.email}`
      .toLocaleLowerCase()
      .includes(search.trim().toLocaleLowerCase()),
  );
  return (
    <View style={{ gap: 12 }}>
      <Button
        secondary
        title={
          open
            ? "Ocultar listado de familias"
            : "Elegir del listado de familias"
        }
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Field
            label="Filtrar listado por familia, nombre o correo"
            value={search}
            onChangeText={setSearch}
          />
          <Text style={s.small}>
            {rows.length} familias cargadas · selecciona una para continuar.
          </Text>
          {!!error && <Notice error text={error} />}
          {found.map((f) => (
            <Pressable
              key={f.uid}
              accessibilityRole="button"
              accessibilityLabel={`Seleccionar ${f.family.name}`}
              onPress={() => onSelect(f)}
              style={{
                padding: 14,
                borderWidth: 1,
                borderColor: colors.line,
                borderRadius: 14,
                backgroundColor: colors.cream,
                gap: 5,
              }}
            >
              <Text style={s.label}>{f.family.name}</Text>
              <Text style={s.small}>
                {f.family.partner1} y {f.family.partner2}
              </Text>
              <Text style={s.small}>
                {f.email || "Sin correo en el resumen"}
              </Text>
            </Pressable>
          ))}
          {!found.length && !busy && (
            <Notice text="No hay coincidencias entre las familias cargadas. Puedes cargar más o buscar una cuenta por correo debajo." />
          )}
          <Button
            secondary
            title={more ? "Cargar 20 familias más" : "Actualizar listado"}
            busy={busy}
            onPress={() => load(more)}
          />
        </>
      )}
    </View>
  );
}
