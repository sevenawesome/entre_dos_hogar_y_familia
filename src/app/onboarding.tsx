import { router } from "expo-router";
import { Screen, Heading, Notice } from "../components/ui";
import { FamilyForm } from "../components/FamilyForm";
export default function Onboarding() {
  return (
    <Screen>
      <Heading
        eyebrow="BIENVENIDOS A ENTRE DOS"
        title="Cada historia empieza con ustedes."
        subtitle="Cuéntennos un poquito de su familia. Este espacio lo construyen juntos."
      />
      <FamilyForm onSaved={() => router.replace("/(tabs)")} />
      <Notice text="A su ritmo, con respeto y sin presiones. Cualquier actividad puede adaptarse a lo que ambos necesiten." />
    </Screen>
  );
}
