import { useState } from "react";
import { DeliveryPreviewModal } from "../components/DeliveryPreviewModal";
import type { FamilyMessage } from "../domain/types";
import { Text } from "react-native";
import { router } from "expo-router";
import { useApp } from "../store";
import { Screen, Heading, Card, Button, Notice, s } from "../components/ui";
export default function Inbox() {
  const { inbox, demo, family } = useApp();
  const [opened, setOpened] = useState<FamilyMessage | null>(null);
  return (
    <Screen>
      <Button
        secondary
        title="Volver a Información"
        onPress={() => router.replace("/(tabs)/information")}
      />
      <Heading
        eyebrow="ACOMPAÑAR SU CAMINO"
        title="Mensajes para ustedes"
        subtitle="Orientación del equipo y felicitaciones de las familias que celebran con ustedes."
      />
      {demo && (
        <Notice text="Bandeja de demostración. Los envíos reales requieren una cuenta y las reglas de Firebase desplegadas." />
      )}
      {!inbox.length ? (
        <Card>
          <Text style={s.sectionTitle}>
            Un espacio abierto para acompañarlos
          </Text>
          <Text style={s.body}>
            Aquí aparecerán los mensajes que la administración envíe a su
            familia. Se reciben al abrir o sincronizar la app.
          </Text>
        </Card>
      ) : (
        inbox.map((m) => (
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
          </Card>
        ))
      )}
      {opened && (
        <DeliveryPreviewModal
          name={family?.name ?? "su familia"}
          title={opened.title}
          body={opened.body}
          attachments={opened.attachments ?? []}
          onClose={() => setOpened(null)}
        />
      )}
    </Screen>
  );
}
