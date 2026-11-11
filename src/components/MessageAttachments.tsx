import { useState } from "react";
import { Image, Text, View } from "react-native";
import type { MessageAttachment } from "../domain/attachments";
import { openMessageAttachment } from "../services/attachments";
import { Button, Notice, s } from "./ui";
export function MessageAttachments({ items }: { items: MessageAttachment[] }) {
  const [error, setError] = useState("");
  return (
    <View style={{ gap: 10 }}>
      {items.map((a, i) => (
        <View key={`${a.name}-${i}`} style={{ gap: 7 }}>
          {a.mime.startsWith("image/") && (
            <Image
              source={{ uri: `data:${a.mime};base64,${a.base64}` }}
              style={{ height: 180, width: "100%", borderRadius: 12 }}
              resizeMode="contain"
            />
          )}
          <Text style={s.small}>
            {a.name} · {Math.ceil(a.size / 1024)} KB
          </Text>
          <Button
            secondary
            title={`Abrir o guardar ${a.name}`}
            onPress={() => {
              setError("");
              void openMessageAttachment(a).catch((e) => setError(e.message));
            }}
          />
        </View>
      ))}
      {!!error && <Notice error text={error} />}
    </View>
  );
}
