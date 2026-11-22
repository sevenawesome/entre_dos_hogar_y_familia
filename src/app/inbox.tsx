import { CommunitySafetyActions } from "../components/CommunitySafety";
import { useState } from "react";
import { SectionTabs } from "../components/SectionTabs";
import { DeliveryPreviewModal } from "../components/DeliveryPreviewModal";
import type { FamilyMessage } from "../domain/types";
import { Text } from "react-native";
import { router } from "expo-router";
import { useApp } from "../store";
import { Screen, Heading, Card, Button, Notice, s } from "../components/ui";
export default function Inbox() {
  const {
    inbox: allInbox,
    demo,
    family,
    communityBlocks,
    communitySafetyReady,
  } = useApp();
  const inbox = allInbox.filter(
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
  const [opened, setOpened] = useState<FamilyMessage | null>(null);
  const currentOpened = inbox.find((m) => m.id === opened?.id);
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
        <Notice text="Bandeja de demostración. Los envíos reales requieren una cuenta y las reglas de Firebase desplegadas." />
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
              onPress={() => setOpened(m)}
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
          name={family?.name ?? "su familia"}
          title={currentOpened.title}
          body={currentOpened.body}
          attachments={currentOpened.attachments ?? []}
          onClose={() => setOpened(null)}
        />
      )}
    </Screen>
  );
}
