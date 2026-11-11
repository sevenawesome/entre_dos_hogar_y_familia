import { Platform } from "react-native";
import {
  validateAttachments,
  type MessageAttachment,
} from "../domain/attachments";
export async function pickMessageAttachment(existing: MessageAttachment[]) {
  const picker = await import("expo-document-picker");
  const result = await picker.getDocumentAsync({
    type: [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "text/plain",
    ],
    multiple: false,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return existing;
  const asset = result.assets[0];
  if ((asset.size ?? 0) > 250 * 1024)
    throw Error(
      "El archivo supera 250 KB. Reduce su tamaño antes de adjuntarlo.",
    );
  let base64: string;
  if (Platform.OS === "web") {
    const bytes = new Uint8Array(await asset.file!.arrayBuffer());
    let raw = "";
    for (let i = 0; i < bytes.length; i += 8192)
      raw += String.fromCharCode(...bytes.subarray(i, i + 8192));
    base64 = btoa(raw);
  } else {
    const { File } = await import("expo-file-system");
    base64 = await new File(asset.uri).base64();
  }
  const extension = asset.name.split(".").at(-1)?.toLowerCase();
  const mime =
    asset.mimeType ||
    (
      {
        pdf: "application/pdf",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
        txt: "text/plain",
      } as Record<string, string>
    )[extension ?? ""];
  const size =
    (base64.length / 4) * 3 -
    (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);
  return validateAttachments([
    ...existing,
    { name: asset.name, mime, base64, size },
  ]);
}
export async function openMessageAttachment(attachment: MessageAttachment) {
  const [a] = validateAttachments([attachment]);
  const bytes = Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0));
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([bytes], { type: a.mime })),
      link = document.createElement("a");
    link.href = url;
    link.download = a.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return;
  }
  const { File, Paths } = await import("expo-file-system"),
    sharing = await import("expo-sharing");
  const file = new File(Paths.cache, `adjunto-${Date.now()}-${a.name}`);
  file.create({ overwrite: true });
  file.write(bytes);
  if (!(await sharing.isAvailableAsync()))
    throw Error("Este dispositivo no permite abrir el archivo desde aquí.");
  await sharing.shareAsync(file.uri, { mimeType: a.mime, dialogTitle: a.name });
}
