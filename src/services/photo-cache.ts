import { Platform } from "react-native";

/** Only app-owned temporary image files. Never delete a photo-library original. */
export async function removeTemporaryPhotos(uris: string[]) {
  if (Platform.OS === "web") return;
  const { File, Paths } = await import("expo-file-system");
  const cache = new URL(Paths.cache.uri).href.replace(/\/?$/, "/");
  for (const uri of new Set(uris)) {
    try {
      if (!new URL(uri).href.startsWith(cache)) continue;
      const file = new File(uri);
      if (file.exists) file.delete();
    } catch {
      /* A temporary image may already have been removed by the OS. */
    }
  }
}
export async function clearTemporaryPhotoCache() {
  if (Platform.OS === "web") return;
  const { Directory, File, Paths } = await import("expo-file-system");
  const cache = new URL(Paths.cache.uri).href.replace(/\/?$/, "/");
  for (const name of ["ImagePicker", "ImageManipulator"]) {
    const directory = new Directory(Paths.cache, name);
    if (new URL(directory.uri).href.startsWith(cache) && directory.exists)
      directory.delete();
  }
  // Some iOS picker versions put their UUID-named temporary images directly in cache.
  for (const entry of Paths.cache.list())
    if (
      entry instanceof File &&
      /^[a-f0-9-]{36}\.(jpe?g|png|heic)$/i.test(entry.name) &&
      new URL(entry.uri).href.startsWith(cache)
    )
      entry.delete();
}
