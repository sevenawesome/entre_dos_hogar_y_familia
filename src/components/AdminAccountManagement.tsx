import { useEffect, useRef, useState } from "react";
import { Text, View, Modal } from "react-native";
import {
  accountsCall,
  type AccountRow,
  type DeletionPreview,
  type DeletionStatus,
} from "../services/admin-accounts";
import { friendlyError } from "../services/api";
import { useApp } from "../store";
import { Button, Card, Field, Notice, s } from "./ui";
export function AdminAccountManagement() {
  const app = useApp(),
    active = useRef(true);
  const [rows, setRows] = useState<AccountRow[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [search, setSearch] = useState(""),
    [preview, setPreview] = useState<DeletionPreview | null>(null),
    [typed, setTyped] = useState(""),
    [jobs, setJobs] = useState<DeletionStatus[]>([]),
    [busy, setBusy] = useState(false),
    [running, setRunning] = useState(false),
    [error, setError] = useState("");
  const owner = app.role === "owner";
  const [view, setView] = useState<"active" | "disabled">("active"),
    [restoreTarget, setRestoreTarget] = useState<AccountRow | null>(null);
  async function load(append = false) {
    setBusy(true);
    setError("");
    try {
      if (app.demo) {
        setRows([
          {
            uid: "demo",
            name: "Su familia",
            email: "propietario@ejemplo.com",
            protected: true,
          },
          {
            uid: "demo-rivera",
            name: "Familia Rivera",
            email: "rivera@ejemplo.com",
            protected: false,
          },
          {
            uid: "demo-garcia",
            name: "Familia García",
            email: "garcia@ejemplo.com",
            protected: false,
            disabled: true,
            restorable: true,
          },
        ]);
        return;
      }
      const [page, history] = await Promise.all([
        accountsCall<{ rows: AccountRow[]; cursor: string | null }>(
          append && cursor ? `?cursor=${encodeURIComponent(cursor)}` : "",
        ),
        accountsCall<{ jobs: DeletionStatus[] }>("/jobs"),
      ]);
      if (!active.current) return;
      setRows((old) => (append ? [...old, ...page.rows] : page.rows));
      setCursor(page.cursor);
      setJobs(history.jobs);
    } catch (e) {
      if (active.current) setError(friendlyError(e));
    } finally {
      if (active.current) setBusy(false);
    }
  }
  useEffect(() => {
    active.current = true;
    const timer = setTimeout(() => {
      if (owner || app.demo) void load();
    }, 0);
    return () => {
      clearTimeout(timer);
      active.current = false;
    };
  }, [owner, app.demo]); // eslint-disable-line react-hooks/exhaustive-deps
  async function prepare(scope: "one" | "all", row?: AccountRow) {
    setBusy(true);
    setError("");
    setTyped("");
    setPreview(null);
    try {
      if (app.demo) {
        const sample = (
          scope === "one" ? [row!] : rows.filter((r) => !r.protected)
        ).map((r) => ({ uid: r.uid, email: r.email }));
        setPreview({
          sample,
          protectedCount: 1,
          job: {
            id: "demo",
            total: sample.length,
            processed: 0,
            deleted: 0,
            skipped: 0,
            state: "preview",
            confirmation: `ELIMINAR ${sample.length} ${sample.length === 1 ? "CUENTA" : "CUENTAS"}`,
            error: null,
          },
        });
        return;
      }
      setPreview(
        await accountsCall<DeletionPreview>("/preview", {
          scope,
          uid: row?.uid,
        }),
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  const updateJob = (job: DeletionStatus) =>
    setJobs((old) => [job, ...old.filter((j) => j.id !== job.id)]);
  async function advance(id: string) {
    setRunning(true);
    setError("");
    try {
      for (let count = 0; active.current && count < 6000; count++) {
        const { job } = await accountsCall<{ job: DeletionStatus }>(
          `/jobs/${id}/step`,
          {},
        );
        if (!active.current) break;
        updateJob(job);
        if (job.error || job.state !== "queued") {
          if (job.error) setError(job.error);
          if (job.state === "complete") await load();
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    } catch (e) {
      if (active.current) setError(friendlyError(e));
    } finally {
      if (active.current) setRunning(false);
    }
  }
  if (!owner && !app.demo)
    return (
      <Notice text="Solo el propietario puede eliminar cuentas y reiniciar las familias." />
    );
  const filtered = rows
    .filter((r) => !!r.disabled === (view === "disabled"))
    .filter((r) =>
      `${r.name} ${r.email}`
        .toLocaleLowerCase()
        .includes(search.trim().toLocaleLowerCase()),
    );
  return (
    <View style={{ gap: 20 }}>
      <Notice text="Solo propietario. La eliminación borra el acceso y los datos de la familia: perfil, foto familiar, fotos individuales y sus copias en la comunidad, progreso, notas, cuestionarios y mensajes. No se puede deshacer. Propietario, administradores, niveles y configuración se conservan." />
      {app.demo && (
        <Notice text="Demostración: puedes revisar el listado y las confirmaciones, pero no se elimina ninguna cuenta." />
      )}
      {!!error && <Notice error text={error} />}
      <Card>
        <View style={s.row}>
          <Button
            secondary={view !== "active"}
            title="Activas"
            onPress={() => setView("active")}
          />
          <Button
            secondary={view !== "disabled"}
            title="Desactivadas"
            onPress={() => setView("disabled")}
          />
        </View>
        <Text style={s.sectionTitle}>Cuentas registradas</Text>
        <Text style={s.small}>
          Las cuentas desactivadas por la familia conservan sus datos y pueden
          restablecerse. La eliminación total desde este panel no tiene
          recuperación.
        </Text>
        <Text style={s.small}>
          Incluye las cuentas que todavía no completaron su perfil familiar. El
          filtro busca entre las cuentas cargadas.
        </Text>
        <Field
          label="Filtrar cuentas por familia o correo"
          value={search}
          onChangeText={setSearch}
        />
        {filtered.map((row) => (
          <View
            key={row.uid}
            style={{
              gap: 8,
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#E5DFCF",
            }}
          >
            <Text style={s.label}>{row.name}</Text>
            <Text style={s.small}>{row.email || row.uid}</Text>
            {row.disabled && (
              <>
                <Notice
                  text={
                    row.restorable
                      ? "Desactivada por la familia · datos conservados"
                      : "Desactivación en proceso o sin recuperación disponible"
                  }
                />
                {row.restorable && (
                  <Button
                    title={`Restablecer ${row.name}`}
                    disabled={busy || running}
                    onPress={() => setRestoreTarget(row)}
                  />
                )}
              </>
            )}
            {row.protected ? (
              <Text style={s.small}>Cuenta administrativa protegida</Text>
            ) : (
              <Button
                secondary
                title={`Revisar eliminación de ${row.name}`}
                disabled={busy || running}
                onPress={() => prepare("one", row)}
              />
            )}
          </View>
        ))}
        {!filtered.length && !busy && (
          <Notice text="No hay cuentas que coincidan entre las cargadas." />
        )}
        {cursor && (
          <Button
            secondary
            title="Cargar más cuentas"
            busy={busy}
            disabled={running}
            onPress={() => load(true)}
          />
        )}
        <Button
          secondary
          title="Actualizar cuentas y procesos"
          busy={busy}
          disabled={running}
          onPress={() => load()}
        />
      </Card>
      {restoreTarget && (
        <Modal
          transparent
          visible
          animationType="fade"
          onRequestClose={() => {
            if (!busy) setRestoreTarget(null);
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "#06264AC9",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <Card>
              <Text style={s.sectionTitle}>
                ¿Restablecer {restoreTarget.name}?
              </Text>
              {!!error && <Notice text={error} />}
              {!!error && <Notice text={error} />}
              <Text style={s.body}>
                La familia podrá volver a iniciar sesión con su cuenta y
                conservará su progreso, fotos y recuerdos. Su participación en
                Comunidad quedará privada hasta que decida activarla otra vez.
              </Text>
              <Button
                title={
                  app.demo
                    ? "Simular restablecimiento"
                    : "Sí, restablecer cuenta"
                }
                busy={busy}
                onPress={async () => {
                  setBusy(true);
                  setError("");
                  try {
                    if (app.demo)
                      setRows((old) =>
                        old.map((r) =>
                          r.uid === restoreTarget.uid
                            ? { ...r, disabled: false, restorable: false }
                            : r,
                        ),
                      );
                    else {
                      await accountsCall(`/${restoreTarget.uid}/restore`, {});
                      await load();
                    }
                    setRestoreTarget(null);
                  } catch (e) {
                    setError(friendlyError(e));
                  } finally {
                    setBusy(false);
                  }
                }}
              />
              <Button
                secondary
                title="Cancelar"
                disabled={busy}
                onPress={() => setRestoreTarget(null)}
              />
            </Card>
          </View>
        </Modal>
      )}
      <Card style={{ borderColor: "#E3ADB6" }}>
        <Text style={s.sectionTitle}>Reiniciar las familias</Text>
        <Text style={s.body}>
          Elimina todas las cuentas de familias, sean de prueba o reales,
          presentes al preparar la vista previa. Las cuentas administrativas,
          los niveles y las opciones generales permanecen.
        </Text>
        <Button
          danger
          title="Revisar eliminación de todas las familias"
          disabled={busy || running}
          onPress={() => prepare("all")}
        />
      </Card>
      {preview && (
        <Card style={{ borderColor: "#A52D3D", borderWidth: 2 }}>
          <Text style={s.sectionTitle}>Revisa antes de eliminar</Text>
          <Text style={s.body}>
            {preview.job.total}{" "}
            {preview.job.total === 1
              ? "cuenta se eliminará"
              : "cuentas se eliminarán"}
            . Cuentas protegidas que se conservan: {preview.protectedCount}.
          </Text>
          {preview.sample.map((row) => (
            <Text key={row.uid} style={s.small}>
              {row.email || row.uid}
            </Text>
          ))}
          {preview.job.total > preview.sample.length && (
            <Text style={s.small}>
              Y {preview.job.total - preview.sample.length} cuentas más. La
              operación incluye todas las familias indicadas en el total.
            </Text>
          )}
          <Notice text="Esta acción es permanente. La vista previa vence en 15 minutos. Para confirmar debes haber iniciado sesión en los últimos cinco minutos." />
          <Field
            label={`Escribe ${preview.job.confirmation}`}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          <Button
            danger
            title="Eliminar de forma permanente"
            disabled={
              app.demo || busy || running || typed !== preview.job.confirmation
            }
            onPress={async () => {
              setBusy(true);
              setError("");
              try {
                const { job } = await accountsCall<{ job: DeletionStatus }>(
                  `/jobs/${preview.job.id}/confirm`,
                  { confirmation: typed },
                );
                updateJob(job);
                setPreview(null);
                setTyped("");
                await advance(job.id);
              } catch (e) {
                setError(friendlyError(e));
              } finally {
                setBusy(false);
              }
            }}
          />
          <Button
            secondary
            title="Cancelar esta vista previa"
            disabled={busy || running}
            onPress={() => {
              setPreview(null);
              setTyped("");
            }}
          />
        </Card>
      )}
      {!!jobs.length && (
        <Card>
          <Text style={s.sectionTitle}>Procesos de eliminación</Text>
          <Text style={s.small}>
            Puedes reanudar una limpieza interrumpida. Las tareas confirmadas
            también avanzan en segundo plano cada diez minutos. Se conservan
            auditorías técnicas y marcas para bloquear sesiones antiguas.
          </Text>
          {jobs.map((job) => (
            <View key={job.id} style={{ gap: 8 }}>
              <Text style={s.label}>
                {job.state === "complete"
                  ? "Limpieza terminada"
                  : job.state === "blocked"
                    ? "Proceso bloqueado"
                    : "Limpieza en curso"}
              </Text>
              <Text style={s.body}>
                {job.deleted} eliminadas · {job.skipped} protegidas omitidas ·{" "}
                {job.processed}/{job.total} revisadas
              </Text>
              {job.state === "queued" && (
                <Button
                  secondary
                  title="Reanudar limpieza"
                  disabled={running || busy}
                  onPress={() => advance(job.id)}
                />
              )}
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}
