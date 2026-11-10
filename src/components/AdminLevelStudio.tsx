import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useApp, store, actions } from "../store";
import { hasPermission } from "../domain/admin-permissions";
import { validateLevel } from "../domain/admin-validation";
import {
  createLevelDraft,
  newChallenge,
  reorderChallenges,
} from "../domain/level-editor";
import { levelIntroduction } from "../domain/level-news";
import type { Challenge, Level } from "../domain/types";
import { bundledLevels } from "../data/catalog";
import { callBackend, friendlyError } from "../services/api";
import { LevelPresentation } from "./LevelPresentation";
import { Button, Card, Field, Notice, colors, s } from "./ui";
type StoredLevel = Level & { auditId?: string };
export function AdminLevelStudio() {
  const app = useApp(),
    allowed = app.demo || hasPermission(app, "content.manage");
  const [levels, setLevels] = useState<StoredLevel[]>(app.levels);
  const [draft, setDraft] = useState<Level>(() => createLevelDraft(app.levels));
  const [saved, setSaved] = useState<StoredLevel | null>(null);
  const [tab, setTab] = useState<
    "general" | "challenges" | "questions" | "preview"
  >("general");
  const [at, setAt] = useState(0),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(app.demo);
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [review, setReview] = useState<Level | null>(null);
  useEffect(() => {
    if (app.demo || !allowed) return;
    let active = true;
    callBackend("adminBootstrap", {})
      .then((r) => {
        if (!active) return;
        const all = (r.data as { levels: StoredLevel[] }).levels;
        setLevels(all);
        setDraft(createLevelDraft(all));
        setLoaded(true);
      })
      .catch((e) => {
        if (active) setError(friendlyError(e));
      });
    return () => {
      active = false;
    };
  }, [app.demo, allowed]);
  const locked = !!saved?.published;
  const change = (data: Partial<Level>) => {
    setDraft((d) => ({ ...d, ...data }));
    setMessage("");
  };
  const editChallenge = (data: Partial<Challenge>) =>
    change({
      challenges: draft.challenges.map((c, i) =>
        i === at ? { ...c, ...data } : c,
      ),
    });
  function select(level?: StoredLevel) {
    setSaved(level ?? null);
    setDraft(
      level
        ? (JSON.parse(JSON.stringify(level)) as Level)
        : createLevelDraft(levels),
    );
    setAt(0);
    setTab("general");
    setError("");
    setMessage("");
  }
  async function persist(level: Level) {
    setBusy(true);
    setError("");
    try {
      if (app.demo) {
        const result = {
          ...level,
          ...(level.published ? { publishedAt: new Date().toISOString() } : {}),
        };
        setLevels((old) =>
          [...old.filter((l) => l.id !== level.id), result].sort(
            (a, b) => a.order - b.order,
          ),
        );
        setSaved(result);
        setDraft(result);
        if (level.published)
          store.dispatch(
            actions.levels(
              [...app.levels.filter((l) => l.id !== level.id), result].sort(
                (a, b) => a.order - b.order,
              ),
            ),
          );
        setMessage(
          level.published
            ? "Publicación simulada. Puedes salir a Hoy y probar el anuncio; no se modificó Firebase ni se enviaron avisos."
            : "Borrador de demostración guardado durante esta sesión.",
        );
      } else {
        await callBackend("adminSaveLevel", {
          level,
          expectedAuditId: saved?.auditId ?? null,
        });
        const response = await callBackend("adminBootstrap", {});
        const all = (response.data as { levels: StoredLevel[] }).levels;
        const stored = all.find((l) => l.id === level.id)!;
        setLevels(all);
        setSaved(stored);
        setDraft(stored);
        setMessage(
          level.published
            ? "Nivel publicado. El anuncio aparecerá en Hoy de las familias al sincronizarse; después de conocerlo seguirá en Nuestro camino."
            : "Borrador privado guardado en Firebase. Todavía no se muestra a las familias.",
        );
      }
      setReview(null);
    } catch (e) {
      setError(friendlyError(e));
      setReview(null);
    } finally {
      setBusy(false);
    }
  }
  function prepare(published: boolean) {
    setError("");
    try {
      const ready = validateLevel({ ...draft, published });
      if (published && !locked) setReview(ready);
      else void persist(ready);
    } catch (e) {
      setError(friendlyError(e));
    }
  }
  if (!allowed)
    return <Notice text="Necesitas permiso para gestionar niveles." />;
  const challenge = draft.challenges[at];
  return (
    <View style={{ gap: 18 }}>
      {!!error && <Notice error text={error} />}
      {!!message && <Notice text={message} />}
      {!loaded && <Notice text="Cargando también los borradores privados…" />}
      <Card>
        <Text style={s.sectionTitle}>Catálogo de niveles</Text>
        <Button
          secondary
          title="Recargar catálogo y descartar cambios sin guardar"
          disabled={busy || app.demo}
          onPress={async () => {
            setBusy(true);
            setError("");
            try {
              const result = await callBackend("adminBootstrap", {});
              const all = (result.data as { levels: StoredLevel[] }).levels;
              setLevels(all);
              setSaved(null);
              setDraft(createLevelDraft(all));
              setAt(0);
              setTab("general");
              setLoaded(true);
              setMessage(
                "Catálogo actualizado. Selecciona un nivel para editarlo o prepara uno nuevo.",
              );
            } catch (e) {
              setError(friendlyError(e));
            } finally {
              setBusy(false);
            }
          }}
        />
        {levels.map((l) => (
          <Pressable
            key={l.id}
            accessibilityRole="button"
            accessibilityLabel={`Editar nivel ${l.order}: ${l.title}`}
            onPress={() => select(l)}
            disabled={busy}
            style={{
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: colors.line,
              gap: 4,
            }}
          >
            <Text style={s.label}>
              Nivel {l.order} · {l.title}
            </Text>
            <Text style={s.small}>
              {l.published
                ? "Publicado · recorrido protegido"
                : "Borrador privado"}{" "}
              · {l.challenges.length}{" "}
              {l.challenges.length === 1 ? "reto" : "retos"}
            </Text>
          </Pressable>
        ))}
        <Button
          secondary
          title="Crear un nivel nuevo"
          disabled={busy || !loaded}
          icon="add"
          onPress={() => select()}
        />
        {!levels.some((l) => l.id === bundledLevels[0].id) && (
          <Button
            secondary
            title="Preparar los 30 retos originales"
            onPress={() => select({ ...bundledLevels[0], published: false })}
          />
        )}
        <Button
          secondary
          title="Cargar catálogo inicial de bodas"
          disabled={app.demo || busy}
          onPress={async () => {
            setBusy(true);
            try {
              await callBackend("adminLoadAnniversaries", {});
              setMessage("Catálogo de bodas disponible.");
            } catch (e) {
              setError(friendlyError(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      </Card>
      <Card>
        <Text style={s.sectionTitle}>
          {locked
            ? "Presentación del nivel publicado"
            : `Formulario · Nivel ${draft.order}`}
        </Text>
        <Text style={s.small}>
          Guarda los cambios antes de cambiar de nivel. Completa los textos
          obligatorios para guardar el borrador o publicar. La vista previa
          cambia mientras escribes.
        </Text>
        {locked && (
          <Notice text="Puedes mejorar la presentación pública. Los retos, preguntas y prerrequisito publicados quedan protegidos para conservar el progreso." />
        )}
        <View style={[s.row, { flexWrap: "wrap" }]}>
          {(
            [
              ["general", "Datos del nivel"],
              ["challenges", "Retos"],
              ["questions", "Preguntas finales"],
              ["preview", "Vista previa"],
            ] as const
          ).map(([id, label]) => (
            <Pressable
              key={id}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === id }}
              onPress={() => setTab(id)}
              style={{
                padding: 12,
                borderRadius: 12,
                backgroundColor: tab === id ? colors.navy : colors.mist,
              }}
            >
              <Text
                style={{
                  color: tab === id ? "white" : colors.ink,
                  fontWeight: "600",
                }}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        {tab === "general" && (
          <>
            <Field
              label="Título del nivel"
              value={draft.title}
              maxLength={100}
              onChangeText={(v) => change({ title: v })}
            />
            <Field
              label="Subtítulo o invitación"
              value={draft.subtitle}
              maxLength={300}
              onChangeText={(v) => change({ subtitle: v })}
            />
            <Field
              label="Presentación pública · de qué trata, sin revelar los retos"
              value={draft.description}
              multiline
              maxLength={2000}
              onChangeText={(v) => change({ description: v })}
            />
            <Text style={s.label}>Nivel que deben completar antes</Text>
            {draft.order === 1 ? (
              <Text style={s.small}>
                Es el primer nivel; no necesita uno anterior.
              </Text>
            ) : (
              levels
                .filter((l) => l.published && l.order < draft.order)
                .map((l) => (
                  <Pressable
                    key={l.id}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: draft.prerequisiteId === l.id,
                      disabled: locked,
                    }}
                    disabled={locked}
                    onPress={() => change({ prerequisiteId: l.id })}
                    style={[
                      s.row,
                      {
                        padding: 12,
                        backgroundColor:
                          draft.prerequisiteId === l.id
                            ? colors.mist
                            : colors.cream,
                        borderRadius: 10,
                      },
                    ]}
                  >
                    <Text style={s.label}>
                      {draft.prerequisiteId === l.id ? "●" : "○"} Nivel{" "}
                      {l.order} · {l.title}
                    </Text>
                  </Pressable>
                ))
            )}
          </>
        )}
        {tab === "challenges" && (
          <>
            <Text style={s.label}>
              {draft.challenges.length} retos · hasta 200 por nivel
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              contentContainerStyle={{ gap: 8 }}
            >
              {draft.challenges.map((c, i) => (
                <Button
                  key={c.id}
                  secondary
                  title={`Reto ${i + 1}${at === i ? " ✓" : ""}`}
                  onPress={() => setAt(i)}
                />
              ))}
            </ScrollView>
            {challenge && (
              <>
                <Field
                  label={`Título del reto ${at + 1}`}
                  value={challenge.title}
                  editable={!locked}
                  maxLength={100}
                  onChangeText={(v) => editChallenge({ title: v })}
                />
                <Field
                  label="Etapa del reto"
                  value={challenge.stage}
                  editable={!locked}
                  maxLength={100}
                  onChangeText={(v) => editChallenge({ stage: v })}
                />
                <Field
                  label="Actividad del reto"
                  value={challenge.description}
                  editable={!locked}
                  multiline
                  maxLength={4000}
                  onChangeText={(v) => editChallenge({ description: v })}
                />
                <Field
                  label="Pregunta para conversar"
                  value={challenge.reflection}
                  editable={!locked}
                  multiline
                  maxLength={1000}
                  onChangeText={(v) => editChallenge({ reflection: v })}
                />
                <Field
                  label="Minutos sugeridos · 1 a 240"
                  value={String(challenge.minutes || "")}
                  editable={!locked}
                  keyboardType="number-pad"
                  onChangeText={(v) =>
                    editChallenge({ minutes: Number(v.replace(/\D/g, "")) })
                  }
                />
                {!locked && (
                  <>
                    <Button
                      secondary
                      title="Mover este reto antes"
                      disabled={at === 0}
                      onPress={() => {
                        change({
                          challenges: reorderChallenges(
                            draft.challenges,
                            at,
                            at - 1,
                          ),
                        });
                        setAt(at - 1);
                      }}
                    />
                    <Button
                      secondary
                      title="Mover este reto después"
                      disabled={at === draft.challenges.length - 1}
                      onPress={() => {
                        change({
                          challenges: reorderChallenges(
                            draft.challenges,
                            at,
                            at + 1,
                          ),
                        });
                        setAt(at + 1);
                      }}
                    />
                    <Button
                      secondary
                      title="Quitar este reto del borrador"
                      disabled={draft.challenges.length === 1}
                      onPress={() => {
                        change({
                          challenges: draft.challenges
                            .filter((_, i) => i !== at)
                            .map((c, i) => ({ ...c, order: i + 1 })),
                        });
                        setAt(Math.max(0, at - 1));
                      }}
                    />
                  </>
                )}
              </>
            )}
            <Button
              secondary
              title="Agregar otro reto"
              disabled={locked || draft.challenges.length >= 200}
              onPress={() => {
                change({
                  challenges: [
                    ...draft.challenges,
                    newChallenge(draft.challenges),
                  ],
                });
                setAt(draft.challenges.length);
              }}
            />
          </>
        )}
        {tab === "questions" && (
          <>
            <Text style={s.small}>
              La pareja responde estas preguntas al terminar todos los retos.
              Hasta 30 preguntas.
            </Text>
            {draft.questions.map((q, i) => (
              <View key={q.id} style={{ gap: 8 }}>
                <Field
                  label={`Pregunta final ${i + 1}`}
                  value={q.label}
                  editable={!locked}
                  multiline
                  maxLength={300}
                  onChangeText={(v) =>
                    change({
                      questions: draft.questions.map((x, n) =>
                        n === i ? { ...x, label: v } : x,
                      ),
                    })
                  }
                />
                {!locked && (
                  <Button
                    secondary
                    title={`Quitar pregunta ${i + 1}`}
                    disabled={draft.questions.length === 1}
                    onPress={() =>
                      change({
                        questions: draft.questions.filter((x) => x.id !== q.id),
                      })
                    }
                  />
                )}
              </View>
            ))}
            <Button
              secondary
              title="Agregar pregunta final"
              disabled={locked || draft.questions.length >= 30}
              onPress={() => {
                let n = 1;
                while (draft.questions.some((q) => q.id === `pregunta-${n}`))
                  n++;
                change({
                  questions: [
                    ...draft.questions,
                    { id: `pregunta-${n}`, label: "" },
                  ],
                });
              }}
            />
          </>
        )}
        {tab === "preview" && (
          <>
            <Notice text="Vista previa privada: esta presentación será pública. La muestra de reto de abajo solo se ve aquí y al avanzar en el recorrido." />
            <LevelPresentation info={levelIntroduction(draft)} />
            <Card
              style={{
                backgroundColor: colors.loveMist,
                borderColor: colors.loveLine,
              }}
            >
              <Text style={s.eyebrow}>MUESTRA PRIVADA · RETO {at + 1}</Text>
              <Text style={s.sectionTitle}>
                {challenge?.title || "Título del reto"}
              </Text>
              <Text style={s.body}>
                {challenge?.description || "La actividad aparecerá aquí."}
              </Text>
              <Text style={s.label}>
                {challenge?.reflection ||
                  "La pregunta para conversar aparecerá aquí."}
              </Text>
            </Card>
            <Text style={s.label}>
              Cuestionario final · vista administrativa
            </Text>
            {draft.questions.map((q, i) => (
              <Text key={q.id} style={s.body}>
                {i + 1}. {q.label || "Completa esta pregunta"}
              </Text>
            ))}
          </>
        )}
        <Button
          secondary
          title={locked ? "Guardar presentación" : "Guardar borrador privado"}
          busy={busy}
          disabled={!loaded}
          onPress={() => prepare(locked)}
        />
        {!locked && (
          <Button
            title="Revisar y publicar nivel"
            disabled={busy || !loaded}
            onPress={() => prepare(true)}
          />
        )}
      </Card>
      <Card>
        <Text style={s.eyebrow}>ASÍ SE ESTÁ QUEDANDO SU PRESENTACIÓN</Text>
        <LevelPresentation info={levelIntroduction(draft)} />
      </Card>
      <Modal
        visible={!!review}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setReview(null);
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            padding: 24,
            backgroundColor: "#06264ACC",
          }}
        >
          <ScrollView
            style={{ maxHeight: "90%" }}
            contentContainerStyle={{ gap: 12 }}
          >
            <Card>
              <Text style={s.sectionTitle}>¿Publicar este nivel?</Text>
              {review && <LevelPresentation info={levelIntroduction(review)} />}
              <Notice text="Las familias verán el anuncio en Hoy y podrán conocer su presentación. El nivel quedará en Nuestro camino; sus retos solo se muestran al desbloquearlo. El teléfono avisará al recibir la actualización si los avisos están habilitados. Después de publicar no podrás cambiar los retos ni las preguntas." />
              {app.demo && (
                <Notice text="Demostración: la publicación solo se simulará en esta sesión, sin Firebase ni notificaciones reales." />
              )}
              <Button
                title={
                  app.demo
                    ? "Simular publicación"
                    : "Sí, publicar para las familias"
                }
                busy={busy}
                onPress={() => {
                  if (review) void persist(review);
                }}
              />
              <Button
                secondary
                title="Volver a revisar"
                disabled={busy}
                onPress={() => setReview(null)}
              />
            </Card>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
