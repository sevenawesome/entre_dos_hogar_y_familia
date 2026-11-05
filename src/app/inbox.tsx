import { Text } from "react-native";
import { router } from "expo-router";
import { useApp } from "../store";
import { Screen, Heading, Card, Button, Notice, s } from "../components/ui";
export default function Inbox() {
  const { inbox, demo } = useApp();
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
        subtitle="Un espacio para recibir orientación y ánimo del Departamento de Hogar y Familia."
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
              · Hogar y Familia
            </Text>
            <Text style={s.body}>{m.body}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}
