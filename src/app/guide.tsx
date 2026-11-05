import { useState } from "react";
import { Text, View, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useApp } from "../store";
import { guideKey, guideSteps } from "../domain/help";
import { Brand } from "../components/Brand";
import { Screen, Heading, Card, Button, colors, s } from "../components/ui";
export default function Guide() {
  const { uid } = useApp();
  const [step, setStep] = useState(0);
  const item = guideSteps[step];
  async function finish() {
    if (uid) await AsyncStorage.setItem(guideKey(uid), "seen").catch(() => {});
    router.replace("/(tabs)");
  }
  return (
    <Screen>
      <View style={{ alignItems: "center", paddingVertical: 15 }}>
        <Brand />
      </View>
      <Heading
        eyebrow={`BIENVENIDOS · ${step + 1} DE ${guideSteps.length}`}
        title={item.title}
      />
      <Card style={{ backgroundColor: colors.lavender, paddingVertical: 30 }}>
        <Ionicons name={item.icon} size={48} color={colors.violet} />
        <Text
          style={[s.body, { color: colors.ink, fontSize: 18, lineHeight: 29 }]}
        >
          {item.body}
        </Text>
      </Card>
      <View style={[s.row, { justifyContent: "center" }]}>
        {guideSteps.map((_, index) => (
          <View
            key={index}
            style={{
              width: index === step ? 25 : 8,
              height: 8,
              backgroundColor: index === step ? colors.rose : colors.line,
              borderRadius: 5,
            }}
          />
        ))}
      </View>
      <Button
        title={
          step === guideSteps.length - 1
            ? "Empezar nuestro camino"
            : "Siguiente"
        }
        onPress={() => {
          if (step === guideSteps.length - 1) finish();
          else setStep(step + 1);
        }}
      />
      {step > 0 && (
        <Button secondary title="Anterior" onPress={() => setStep(step - 1)} />
      )}
      <Pressable accessibilityRole="button" onPress={finish}>
        <Text style={[s.link, { textAlign: "center" }]}>
          Ahora no · Ver después en Información
        </Text>
      </Pressable>
      <Text style={[s.small, { textAlign: "center" }]}>
        Siempre podrán volver a esta guía desde Información.
      </Text>
    </Screen>
  );
}
