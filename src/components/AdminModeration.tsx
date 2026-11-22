import { useEffect, useState } from "react";
import { Text, View, Switch } from "react-native";
import type { CommunityProfile } from "../domain/types";
import { reportReasons } from "../domain/community-safety";
import { communityRequest } from "../services/community-safety";
import { friendlyError } from "../services/api";
import { useApp } from "../store";
import { PhotoViewer } from "./PhotoViewer";
import { SafetyModal } from "./SafetyModal";
import { Button, Card, Field, Notice, s, colors } from "./ui";

type Profile = CommunityProfile & {
  version: string;
  review: { state: string; note?: string } | null;
};
type Report = {
  id: string;
  targetUid: string;
  targetType: string;
  targetId: string;
  targetVersion: string;
  reason: keyof typeof reportReasons;
  detail: string;
  snapshot: {
    alias?: string;
    avatar?: string;
    people?: CommunityProfile["people"];
    senderAlias?: string;
    body?: string;
    anniversaryDate?: string;
  };
};
type Page = { profiles: Profile[]; reports: Report[]; cursor: string | null };
const statusLabel = (p: Profile) =>
  p.review?.state === "suspended"
    ? "Participación suspendida"
    : p.moderationStatus === "approved"
      ? "Publicado"
      : p.moderationStatus === "removed"
        ? "Retirado"
        : "Pendiente de revisión";
export function AdminModeration() {
  const { demo, uid } = useApp();
  const [profiles, setProfiles] = useState<Profile[]>([]),
    [reports, setReports] = useState<Report[]>([]),
    [cursor, setCursor] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "all" | "reports">("pending"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [preview, setPreview] = useState<Profile | null>(null),
    [report, setReport] = useState<Report | null>(null),
    [note, setNote] = useState(""),
    [checked, setChecked] = useState(false),
    [confirm, setConfirm] = useState<string | null>(null);
  async function load(append = false) {
    if (demo) return;
    setBusy(true);
    setError("");
    try {
      const page = await communityRequest<Page>(
        `moderation${append && cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      setProfiles((old) =>
        append
          ? [
              ...old,
              ...page.profiles.filter((p) => !old.some((o) => o.uid === p.uid)),
            ]
          : page.profiles,
      );
      setReports(page.reports);
      setCursor(page.cursor);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [uid, demo]); // eslint-disable-line react-hooks/exhaustive-deps
  function openProfile(p: Profile) {
    setPreview(p);
    setReport(null);
    setNote("");
    setChecked(false);
    setConfirm(null);
    setError("");
  }
  function openReport(r: Report) {
    setReport(r);
    setPreview(null);
    setNote("");
    setChecked(false);
    setConfirm(null);
    setError("");
  }
  function close() {
    setPreview(null);
    setReport(null);
    setConfirm(null);
    setError("");
  }
  async function decide() {
    if (!confirm || demo) return;
    setBusy(true);
    setError("");
    try {
      if (report)
        await communityRequest("moderation/report", {
          id: report.id,
          action: confirm,
          note,
        });
      else if (preview)
        await communityRequest("moderation/profile", {
          uid: preview.uid,
          version: preview.version,
          action: confirm,
          note,
        });
      close();
      setMessage(
        "Decisión guardada. La familia verá el estado de revisión en Comunidad → Compartir.",
      );
      await load();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  const shown = profiles.filter(
    (p) =>
      tab === "all" ||
      (p.moderationStatus !== "approved" &&
        p.moderationStatus !== "removed" &&
        p.review?.state !== "suspended"),
  );
  return (
    <>
      <Notice text="Revisa los perfiles antes de publicarlos y atiende los reportes de forma habitual, procurando resolverlos dentro de 24 horas. No se permite contenido sexual, violento, discriminatorio, acoso ni datos privados de terceros. El panel solo muestra perfiles compartidos y las felicitaciones reportadas." />
      {demo && (
        <Notice text="Demostración: aquí se revisarán los perfiles y reportes reales. No se modifica ninguna cuenta." />
      )}
      <View style={{ gap: 8 }}>
        <Button
          secondary
          title="Perfiles pendientes"
          onPress={() => setTab("pending")}
        />
        <Button
          secondary
          title="Todos los perfiles cargados"
          onPress={() => setTab("all")}
        />
        <Button
          secondary
          title={`Reportes abiertos · ${reports.length}`}
          onPress={() => setTab("reports")}
        />
      </View>
      {!!message && <Notice text={message} />}
      {!!error && !preview && !report && <Notice error text={error} />}
      {tab !== "reports" &&
        shown.map((p) => (
          <Card key={p.uid}>
            <View style={s.row}>
              <PhotoViewer uri={p.avatar} name={p.alias} size={64} />
              <View style={{ flex: 1 }}>
                <Text style={s.sectionTitle}>{p.alias}</Text>
                <Text style={s.small}>{statusLabel(p)}</Text>
              </View>
            </View>
            <Button
              title="Abrir vista previa y revisar"
              onPress={() => openProfile(p)}
            />
          </Card>
        ))}
      {tab === "reports" &&
        reports.map((r) => (
          <Card key={r.id}>
            <Text style={s.sectionTitle}>
              {reportReasons[r.reason] ?? "Reporte de Comunidad"}
            </Text>
            <Text style={s.body}>
              {r.snapshot.alias ??
                r.snapshot.senderAlias ??
                "Contenido reportado"}
            </Text>
            <Text style={s.small} numberOfLines={3}>
              {r.detail || "Sin detalle adicional."}
            </Text>
            <Button title="Revisar reporte" onPress={() => openReport(r)} />
          </Card>
        ))}
      {!busy && !(tab === "reports" ? reports : shown).length && (
        <Notice text="No hay elementos en esta página. Carga más perfiles o actualiza para comprobar nuevas solicitudes." />
      )}
      {!!cursor && tab !== "reports" && (
        <Button
          secondary
          busy={busy}
          title="Cargar otros 20 perfiles"
          onPress={() => load(true)}
        />
      )}
      <Button
        secondary
        busy={busy}
        title="Actualizar perfiles y reportes"
        onPress={() => load()}
      />
      {(preview || report) && (
        <SafetyModal
          title={
            report
              ? "Revisar contenido reportado"
              : "Vista previa del perfil público"
          }
          busy={busy}
          onClose={close}
        >
          {(() => {
            const content = preview ?? report!.snapshot;
            const alias =
              "alias" in content ? content.alias : report?.snapshot.senderAlias;
            return (
              <>
                {!!content.avatar && (
                  <PhotoViewer
                    uri={content.avatar}
                    name={alias ?? "Familia"}
                    size={150}
                  />
                )}
                <Text style={s.sectionTitle}>{alias}</Text>
                {content.people?.map((person) => (
                  <View key={person.key} style={s.row}>
                    <PhotoViewer
                      uri={person.avatar}
                      name={person.name}
                      size={84}
                    />
                    <Text style={[s.body, { flex: 1 }]}>
                      {person.name} · cumpleaños {person.monthDay}
                    </Text>
                  </View>
                ))}
              </>
            );
          })()}
          {preview && (
            <>
              <Text style={s.label}>{statusLabel(preview)}</Text>
              <Text style={s.small}>
                Revisa todas las fotos, incluido su contenido ampliado, los
                nombres y el consentimiento. Si el perfil cambia mientras lo
                revisas, el servicio exigirá actualizar la vista previa.
              </Text>
              {preview.shareAnniversary && (
                <Text style={s.body}>Aniversario: {preview.marriageDate}</Text>
              )}
              {preview.shareProgress && (
                <Text style={s.body}>
                  {preview.completedCount} retos · {preview.finishedCount}{" "}
                  niveles
                </Text>
              )}
              {!!preview.review?.note && (
                <Notice text={`Última revisión: ${preview.review.note}`} />
              )}
              <View style={s.row}>
                <Text style={[s.body, { flex: 1 }]}>
                  Revisé nombres y todas las fotos y cumplen las normas.
                </Text>
                <Switch
                  accessibilityLabel="Confirmar revisión de nombres y fotos"
                  value={checked}
                  onValueChange={setChecked}
                />
              </View>
            </>
          )}
          {report && (
            <>
              <Text style={s.label}>{reportReasons[report.reason]}</Text>
              <Text style={s.body}>
                {report.detail || "Sin detalle adicional."}
              </Text>
              {!!report.snapshot.body && (
                <Card style={{ backgroundColor: colors.mist }}>
                  <Text style={s.label}>Copia del mensaje reportado</Text>
                  <Text style={s.body}>{report.snapshot.body}</Text>
                </Card>
              )}
              <Text style={s.small}>
                No compartas el reporte ni la identidad de quien lo envió.
                Retirar un perfil cambiado requiere revisarlo de nuevo desde la
                lista de perfiles.
              </Text>
            </>
          )}
          <Field
            label="Motivo o resultado de la revisión (visible para la familia en su perfil)"
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={600}
          />
          {!confirm &&
            (report ? (
              <>
                <Button
                  title="Cerrar reporte sin retirar contenido"
                  disabled={!note.trim()}
                  onPress={() => setConfirm("dismiss")}
                />
                <Button
                  danger
                  title="Retirar el contenido reportado"
                  disabled={!note.trim()}
                  onPress={() => setConfirm("remove")}
                />
              </>
            ) : preview?.review?.state === "suspended" ? (
              <Button
                title="Levantar suspensión y volver a revisión"
                onPress={() => setConfirm("reinstate")}
              />
            ) : (
              <>
                <Button
                  title="Aprobar publicación"
                  disabled={!checked || !preview?.visible}
                  onPress={() => setConfirm("approve")}
                />
                <Button
                  secondary
                  danger
                  title="Retirar perfil público"
                  disabled={!note.trim()}
                  onPress={() => setConfirm("remove")}
                />
                <Button
                  danger
                  title="Suspender participación en Comunidad"
                  disabled={!note.trim()}
                  onPress={() => setConfirm("suspend")}
                />
              </>
            ))}
          {!!confirm && (
            <>
              <Notice
                text={
                  confirm === "approve"
                    ? "¿Publicar el perfil y las fotos revisadas para las familias de Comunidad?"
                    : confirm === "suspend"
                      ? "¿Ocultar el perfil e impedir nuevas felicitaciones de esta familia? Su cuenta y progreso se conservarán."
                      : confirm === "reinstate"
                        ? "¿Levantar la suspensión? El perfil aún requerirá aprobación para publicarse."
                        : confirm === "dismiss"
                          ? "¿Guardar esta revisión y cerrar el reporte?"
                          : "¿Retirar el contenido? Dejará de mostrarse en Comunidad o se sustituirá por un aviso en los recuerdos."
                }
              />
              <Button
                title="Confirmar decisión"
                busy={busy}
                danger={confirm === "remove" || confirm === "suspend"}
                onPress={decide}
              />
              <Button
                secondary
                title="Seguir revisando"
                disabled={busy}
                onPress={() => setConfirm(null)}
              />
            </>
          )}
          {!!error && <Notice error text={error} />}
        </SafetyModal>
      )}
    </>
  );
}
