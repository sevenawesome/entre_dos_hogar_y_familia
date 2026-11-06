import { router } from "expo-router";
import { Screen, Heading, Notice } from "../components/ui";
import { FamilyForm } from "../components/FamilyForm";
import { useApp } from "../store";
export default function Onboarding() {
  const { family } = useApp();
  return (
    <Screen>
      <Heading
        eyebrow="BIENVENIDOS A Amor que permanece"
        title={
          family
            ? "Completemos su historia."
            : "Cada historia empieza con ustedes."
        }
        subtitle={
          family
            ? "Agreguen la fecha de su matrimonio para continuar. Conservamos los datos y el progreso de su familia."
            : "Cuéntennos de su familia y cuándo se casaron. La fecha de matrimonio es obligatoria."
        }
      />
      <FamilyForm initial={family} onSaved={() => router.replace("/(tabs)")} />
      <Notice text="A su ritmo, con respeto y sin presiones. Cualquier actividad puede adaptarse a lo que ambos necesiten." />
    </Screen>
  );
}
