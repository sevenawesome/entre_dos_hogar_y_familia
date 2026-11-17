import { useRef, useState } from "react";
import {
  Image,
  Pressable,
  Text,
  View,
  type ScrollViewInstance,
} from "react-native";
import { router } from "expo-router";
import { AccessBackButton } from "../components/AccessBackButton";
import { Screen, Button, colors, s, serif } from "../components/ui";
import { productTour } from "../content/product-tour";

export default function ProductTour() {
  const [step, setStep] = useState(0);
  const scrollRef = useRef<ScrollViewInstance>(null);
  const item = productTour[step];
  const last = step === productTour.length - 1;
  function changeStep(index: number) {
    setStep(index);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }
  function signup() {
    router.replace({ pathname: "/welcome", params: { mode: "signup" } });
  }
  return (
    <Screen scrollRef={scrollRef}>
      <View style={[s.row, { justifyContent: "space-between" }]}>
        <AccessBackButton />
        <Text style={s.eyebrow}>
          CONOCE LA APP · {step + 1}/{productTour.length}
        </Text>
      </View>
      <Text
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        style={{
          fontFamily: serif,
          fontSize: 30,
          lineHeight: 37,
          color: colors.ink,
        }}
      >
        {item.title}
      </Text>
      <View style={{ gap: 9 }}>
        <View
          style={{
            width: "100%",
            aspectRatio: 720 / 760,
            borderRadius: 24,
            overflow: "hidden",
          }}
        >
          <Image
            key={step}
            source={item.image}
            resizeMode="contain"
            accessibilityLabel={`Ilustración de ejemplo. ${item.title}. ${item.description}`}
            style={{ width: "100%", height: "100%" }}
          />
        </View>
        <Text style={[s.small, { textAlign: "center" }]}>
          Imágenes ilustrativas · sin datos de familias reales
        </Text>
      </View>
      <Text style={[s.body, { color: colors.ink }]}>{item.description}</Text>
      <Text style={s.body}>{item.detail}</Text>
      <View style={[s.row, { justifyContent: "center", gap: 0 }]}>
        {productTour.map((slide, index) => (
          <Pressable
            key={slide.title}
            accessibilityRole="button"
            accessibilityLabel={`Ver imagen ${index + 1}: ${slide.title}`}
            accessibilityState={{ selected: step === index }}
            onPress={() => changeStep(index)}
            style={{
              minWidth: 44,
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: index === step ? 24 : 8,
                height: 8,
                borderRadius: 5,
                backgroundColor: index === step ? colors.love : colors.line,
              }}
            />
          </Pressable>
        ))}
      </View>
      <Button
        title={last ? "Crear nuestra cuenta" : "Siguiente imagen"}
        icon={last ? "heart-outline" : "images-outline"}
        tone="love"
        onPress={() => {
          if (last) signup();
          else changeStep(step + 1);
        }}
      />
      {step > 0 && (
        <Button
          secondary
          title="Imagen anterior"
          onPress={() => changeStep(step - 1)}
        />
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => router.replace("/welcome")}
        style={{ minHeight: 44, justifyContent: "center" }}
      >
        <Text style={[s.link, { textAlign: "center" }]}>
          Ya tenemos cuenta · Iniciar sesión
        </Text>
      </Pressable>
    </Screen>
  );
}
