import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { store, actions } from "../store";
import {
  publicProjection,
  publicProjectionFromSummary,
} from "../domain/community";
import {
  familyMembers,
  validatePortraits,
  publicBirthdayPeople,
} from "../domain/people";
import type {
  CommunityProfile,
  Family,
  FamilyPortraits,
  PersonPortrait,
} from "../domain/types";
export async function pickPhoto(
  size: number,
  maxLength: number,
  source: "library" | "camera" = "library",
): Promise<string | null> {
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw Error("Permite usar la cámara o elige una foto de la galería.");
  }
  const options = {
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  } satisfies ImagePicker.ImagePickerOptions;
  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled) return null;
  const asset = result.assets[0],
    edge = Math.min(asset.width, asset.height);
  const context = ImageManipulator.manipulate(asset.uri);
  context
    .crop({
      originX: Math.round((asset.width - edge) / 2),
      originY: Math.round((asset.height - edge) / 2),
      width: edge,
      height: edge,
    })
    .resize({ width: size, height: size });
  const rendered = await context.renderAsync();
  for (const compress of [0.65, 0.45, 0.25, 0.15]) {
    const output = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress,
      base64: true,
    });
    const data = `data:image/jpeg;base64,${output.base64}`;
    if (output.base64 && data.length <= maxLength) return data;
  }
  throw new Error(
    "La foto sigue siendo demasiado grande. Elige una imagen más sencilla.",
  );
}
export async function savePersonPortrait(
  key: string,
  patch: Partial<PersonPortrait>,
) {
  const state = store.getState().app;
  if (state.demo) {
    if (!state.family) throw new Error("Primero registren su familia.");
    const portraits = validatePortraits(
      {
        ...state.portraits,
        [key]: {
          ...(state.portraits[key] ?? { dataUri: null, shareBirthday: false }),
          ...patch,
        },
      },
      state.family,
    );
    store.dispatch(actions.portraits(portraits));
    if (state.communityProfile)
      store.dispatch(
        actions.communityProfile(
          publicProjection(
            state.communityProfile,
            state.family,
            state.progress,
            portraits,
          ),
        ),
      );
    return;
  }
  if (!db || !auth?.currentUser)
    throw new Error("Inicia sesión para guardar las fotos.");
  const uid = auth.currentUser.uid,
    database = db;
  await runTransaction(database, async (tx) => {
    const photoRef = doc(database, "portraits", uid),
      profileRef = doc(database, "community", uid);
    const [photo, profile, family, summary] = await Promise.all([
      tx.get(photoRef),
      tx.get(profileRef),
      tx.get(doc(database, "families", uid)),
      tx.get(doc(database, "tracking", uid)),
    ]);
    if (!family.exists() || !summary.exists())
      throw new Error("Primero registren su familia.");
    const f = family.data() as Family;
    if (!familyMembers(f).some((p) => p.key === key))
      throw new Error(
        "Esa persona ya no aparece en su familia. Actualiza la pantalla.",
      );
    const old = (photo.data()?.people ?? {}) as FamilyPortraits;
    const people = validatePortraits(
      {
        ...old,
        [key]: {
          ...(old[key] ?? { dataUri: null, shareBirthday: false }),
          ...patch,
        },
      },
      f,
    );
    tx.set(photoRef, {
      people,
      editKey: key,
      publicPeople: publicBirthdayPeople(f, people),
      updatedAt: serverTimestamp(),
    });
    if (profile.exists())
      tx.set(profileRef, {
        ...publicProjectionFromSummary(
          profile.data() as CommunityProfile,
          f,
          {
            totalCompleted: summary.data().totalCompleted,
            finishedCount: summary.data().finishedCount,
          },
          people,
        ),
        updatedAt: serverTimestamp(),
      });
  });
}
export async function saveFamilySharing(
  input: Pick<
    CommunityProfile,
    "alias" | "visible" | "shareAnniversary" | "shareProgress"
  >,
  photo: string | null,
) {
  if (!db || !auth?.currentUser)
    throw new Error("Inicia sesión para guardar el perfil.");
  const uid = auth.currentUser.uid,
    database = db;
  await runTransaction(database, async (tx) => {
    const photoRef = doc(database, "portraits", uid);
    const [family, summary, portraits] = await Promise.all([
      tx.get(doc(database, "families", uid)),
      tx.get(doc(database, "tracking", uid)),
      tx.get(photoRef),
    ]);
    if (!family.exists() || !summary.exists())
      throw new Error("Primero registren su familia.");
    const f = family.data() as Family,
      people = validatePortraits(portraits.data()?.people ?? {}, f);
    const profile = publicProjectionFromSummary(
      {
        uid,
        ...input,
        avatar: photo,
        timezone: f.timezone,
        marriageDate: null,
        completedCount: 0,
        finishedCount: 0,
      },
      f,
      {
        totalCompleted: summary.data().totalCompleted,
        finishedCount: summary.data().finishedCount,
      },
      people,
    );
    if (photo)
      tx.set(doc(database, "avatars", uid), {
        dataUri: photo,
        updatedAt: serverTimestamp(),
      });
    if (portraits.exists())
      tx.set(photoRef, {
        people,
        editKey: null,
        publicPeople: publicBirthdayPeople(f, people),
        updatedAt: serverTimestamp(),
      });
    tx.set(doc(database, "community", uid), {
      ...profile,
      updatedAt: serverTimestamp(),
    });
  });
}
