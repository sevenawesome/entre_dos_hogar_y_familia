import { useState } from "react";
import { Modal, Image, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "./Avatar";
import { colors } from "./ui";
export function PhotoViewer({
  uri,
  name,
  size = 64,
  large = false,
}: {
  uri?: string | null;
  name: string;
  size?: number;
  large?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [failed, setFailed] = useState<string | null>(null);
  const usable = !!uri && uri !== failed;
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ver foto de ${name}`}
        disabled={!usable}
        onPress={() => setOpen(true)}
        style={
          large
            ? {
                width: "100%",
                borderRadius: 20,
                overflow: "hidden",
                backgroundColor: colors.blush,
                alignItems: "center",
              }
            : undefined
        }
      >
        {large && usable ? (
          <Image
            source={{ uri }}
            onError={() => setFailed(uri!)}
            style={{ width: "100%", aspectRatio: 1.4 }}
            resizeMode="cover"
          />
        ) : (
          <Avatar uri={uri} name={name} size={large ? 100 : size} />
        )}
        {large && usable && (
          <Text
            style={{
              position: "absolute",
              bottom: 10,
              right: 10,
              color: "white",
              backgroundColor: "#343047B0",
              padding: 8,
              borderRadius: 10,
              fontSize: 12,
            }}
          >
            Tocar para ampliar
          </Text>
        )}
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView
          style={{
            flex: 1,
            backgroundColor: "#171420F5",
            padding: 20,
            justifyContent: "center",
            gap: 18,
          }}
        >
          <Text style={{ color: "white", fontSize: 22, textAlign: "center" }}>
            {name}
          </Text>
          <View style={{ height: "72%", width: "100%" }}>
            <Image
              source={uri ? { uri } : undefined}
              style={{ width: "100%", height: "100%" }}
              resizeMode="contain"
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => setOpen(false)}
            style={{
              padding: 18,
              backgroundColor: "white",
              borderRadius: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.ink, fontWeight: "700" }}>
              Cerrar foto
            </Text>
          </Pressable>
        </SafeAreaView>
      </Modal>
    </>
  );
}
