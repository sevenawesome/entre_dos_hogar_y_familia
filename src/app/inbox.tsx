import { CommunitySafetyActions } from "../components/CommunitySafety";
import { useEffect, useState } from "react";
import { SectionTabs } from "../components/SectionTabs";
import { DeliveryPreviewModal } from "../components/DeliveryPreviewModal";
import type { FamilyMessage } from "../domain/types";
import { Text } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { friendlyError, subscribeInboxMessage } from "../services/api";
import { useApp } from "../store";
import { Screen, Heading, Card, Button, Notice, s } from "../components/ui";
export default function Inbox() {
  const {
    uid,
    inbox: allInbox,
    demo,
    family,
    communityBlocks,
    communitySafetyReady,
  } = useApp();
  const { messageId: requested } = useLocalSearchParams<{
    messageId?: string;
  }>();
  const messageId =
    typeof requested === "string" && /^[A-Za-z0-9_-]{1,500}$/.test(requested)
      ? requested
      : null;
  const [target, setTarget] = useState<{
    uid: string;
    id: string;
    message: FamilyMessage | null;
  } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!uid || demo || !messageId) return;
    return subscribeInboxMessage(
      uid,
      messageId,
      (message) => setTarget({ uid, id: messageId, message }),
      (e) => setError(friendlyError(e)),
    );
  }, [uid, demo, messageId]);
  const targetReady = target?.uid === uid && target?.id === messageId;
  const messages = targetReady
    ? [
        ...allInbox.filter((m) => m.id !== messageId),
        ...(target?.message ? [target.message] : []),
      ]
    : allInbox;
  const inbox = messages.filter(
    (m) =>
      m.kind !== "anniversaryGreeting" ||
      (communitySafetyReady &&
        !communityBlocks.some((b) => b.uid === m.senderUid)),
  );
  const [section, setSection] = useState<"all" | "team" | "community">("all");
  const displayed = inbox.filter(
    (message) =>
      section === "all" ||
      (section === "community"
        ? message.kind === "anniversaryGreeting"
        : message.kind !== "anniversaryGreeting"),
  );
  const [openedId, setOpenedId] = useState<string | null>(null);
  const currentOpened = inbox.find((m) => m.id === (messageId ?? openedId));
  return (
    <Screen>
      <Button
        secondary
        title="Volver a Información"
        onPress={() =>
          router.replace({
            pathname: "/(tabs)/information",
            params: { section: "messages" },
          })
        }
      />
      <Heading eyebrow="ACOMPAÑAR SU CAMINO" title="Mensajes para ustedes" />
      {!!error && <Notice error text={error} />}
      {messageId && targetReady && !currentOpened && (
        <Notice text="Este mensaje ya no está disponible para su cuenta." />
      )}
      <SectionTabs
        selected={section}
        options={[
          {
            id: "all",
            title: "Todos",
            icon: "mail-outline",
            description: "Todos los mensajes guardados para su familia.",
            count: inbox.length,
          },
          {
            id: "team",
            title: "Equipo",
            icon: "chatbubbles-outline",
            description:
              "Orientación y avisos del Departamento de Hogar y Familia.",
          },
          {
            id: "community",
            title: "Comunidad",
            icon: "heart-outline",
            description:
              "Felicitaciones de las familias que celebran su aniversario con ustedes.",
          },
        ]}
        onSelect={setSection}
      />
      {demo && (
        <Notice text="Bandeja de demostración. Los mensajes de ejemplo no se envían." />
      )}
      {!displayed.length ? (
        <Card>
          <Text style={s.sectionTitle}>
            {section === "all"
              ? "Un espacio abierto para acompañarlos"
              : "Todavía no hay mensajes en este apartado"}
          </Text>
          <Text style={s.body}>
            {section === "community"
              ? "Las felicitaciones que reciban por su aniversario aparecerán aquí y en sus recuerdos."
              : "Aquí aparecerán los mensajes que el equipo envíe a su familia. Se reciben al abrir o sincronizar la app."}
          </Text>
        </Card>
      ) : (
        displayed.map((m) => (
          <Card key={m.id}>
            <Text style={s.sectionTitle}>{m.title}</Text>
            <Text style={s.small}>
              {m.createdAt
                ? new Date(String(m.createdAt)).toLocaleDateString("es")
                : "Ahora"}{" "}
              ·{" "}
              {m.kind === "anniversaryGreeting"
                ? "Comunidad"
                : "Hogar y Familia"}
            </Text>
            <Text style={s.body} numberOfLines={2}>
              {m.body}
            </Text>
            <Button
              secondary
              title="Abrir mensaje"
              onPress={() => setOpenedId(m.id)}
            />
            {m.kind === "anniversaryGreeting" && (
              <Button
                secondary
                title="Ver el recuerdo de aniversario"
                onPress={() => router.push("/anniversary-memories")}
              />
            )}
            {m.kind === "anniversaryGreeting" && (
              <CommunitySafetyActions
                targetUid={m.senderUid}
                label="Familia remitente"
                targetType="greeting"
                targetId={m.id.replace(/^anniversary-/, "")}
              />
            )}
          </Card>
        ))
      )}
      {currentOpened && (
        <DeliveryPreviewModal
          closeLabel="Cerrar mensaje"
          name={family?.name ?? "su familia"}
          title={currentOpened.title}
          body={currentOpened.body}
          attachments={currentOpened.attachments ?? []}
          onClose={() => {
            setOpenedId(null);
            router.setParams({ messageId: "" });
          }}
        />
      )}
    </Screen>
  );
}
