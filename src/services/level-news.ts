import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { store, actions } from "../store";
export async function acknowledgeLevelNews(levelId: string) {
  const app = store.getState().app;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(levelId)) throw Error("Nivel inválido.");
  if (app.demo) {
    store.dispatch(
      actions.levelNewsRead([...new Set([...app.levelNewsRead, levelId])]),
    );
    return;
  }
  const uid = auth?.currentUser?.uid;
  if (!db || !uid) throw Error("Inicia sesión para continuar.");
  const database = db;
  await runTransaction(database, async (tx) => {
    const ref = doc(database, "families", uid, "levelNews", levelId);
    const [old, level] = await Promise.all([
      tx.get(ref),
      tx.get(doc(database, "levels", levelId)),
    ]);
    if (!level.data()?.published)
      throw Error("Este nivel ya no está disponible.");
    if (!old.exists()) tx.set(ref, { seenAt: serverTimestamp() });
  });
}
