import { useState } from "react";
import { Text } from "react-native";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  signOut,
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";
import { router } from "expo-router";
import { auth, db } from "../services/firebase";
import { clearAccountNotifications } from "../services/notifications";
import { friendlyError } from "../services/api";
import { useApp, store, actions } from "../store";
import { SafetyModal } from "./SafetyModal";
import { Button, Card, Field, Notice, s } from "./ui";

export function PermanentDeletionCard() {
  const { demo, uid, role } = useApp();
  const [opened, setOpened] = useState(false),
    [password, setPassword] = useState(""),
    [confirmation, setConfirmation] = useState(""),
    [successorUid, setSuccessor] = useState("");
  const [admins, setAdmins] = useState<{ uid: string; label: string }[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function close() {
    setOpened(false);
    setPassword("");
    setConfirmation("");
    setError("");
  }
  async function loadAdmins() {
    setBusy(true);
    setError("");
    try {
      const page = await getDocs(
        query(
          collection(db!, "roles"),
          where("role", "==", "admin"),
          limit(50),
        ),
      );
      setAdmins(
        await Promise.all(
          page.docs
            .filter((d) => d.id !== uid)
            .map(async (d) => {
              const summary = (await getDoc(doc(db!, "tracking", d.id))).data();
              return {
                uid: d.id,
                label: `${summary?.familyName ?? "Administrador"} · ${summary?.email ?? d.id}`,
              };
            }),
        ),
      );
      if (page.empty)
        setError(
          "Primero crea otro administrador en Administración → Administradores. Tu cuenta propietaria seguirá protegida.",
        );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    setBusy(true);
    setError("");
    try {
      const user = auth?.currentUser;
      if (!user?.email || user.uid !== uid)
        throw Error("Vuelve a iniciar sesión antes de continuar.");
      await reauthenticateWithCredential(
        user,
        EmailAuthProvider.credential(user.email, password),
      );
      const token = await user.getIdToken(true);
      const response = await fetch(
        "https://entre-dos-correo.sevenawesome-srl.workers.dev/account/delete",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            confirmation,
            ...(role === "owner" ? { successorUid } : {}),
          }),
          signal: AbortSignal.timeout(60000),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.accepted)
        throw Error(
          result.error ??
            "No se pudo confirmar la eliminación. Vuelve a intentarlo.",
        );
      await clearAccountNotifications(user.uid).catch(() => {});
      await signOut(auth!).catch(() => {});
      store.dispatch(actions.session({ uid: null }));
      close();
      router.replace("/welcome");
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  if (demo || !uid) return null;
  return (
    <Card>
      <Text style={s.sectionTitle}>
        Eliminar definitivamente nuestra cuenta
      </Text>
      <Text style={s.body}>
        Esta opción elimina la cuenta compartida y sus datos para ambos integrantes.
        No se puede restablecer desde Administración.
      </Text>
      <Button
        secondary
        danger
        title="Eliminar cuenta y datos"
        icon="trash-outline"
        onPress={() => setOpened(true)}
      />
      {opened && (
        <SafetyModal
          title="Confirma el borrado definitivo"
          busy={busy}
          onClose={close}
        >
          <Notice
            error
            text="Se borrarán el acceso de ambos, sus fotos y nombres, notas, respuestas, progreso y felicitaciones enviadas o recibidas. Coordínenlo antes de continuar. Esta acción es irreversible."
          />
          <Text style={s.small}>
            La cuenta desaparecerá de Comunidad inmediatamente. Si la limpieza
            necesita más tiempo, continuará automáticamente, aunque cierres la
            app. Conservamos solo identificadores técnicos de la solicitud para
            completar y auditar el borrado.
          </Text>
          {role === "owner" && (
            <>
              <Notice text="Los reinicios nunca borran tu cuenta propietaria. Para eliminarla expresamente aquí, debes transferir primero la propiedad a otro administrador activo con correo verificado." />
              <Button
                secondary
                title="Cargar administradores para elegir sucesor"
                busy={busy}
                onPress={loadAdmins}
              />
              {admins.map((admin) => (
                <Button
                  key={admin.uid}
                  secondary
                  title={`${successorUid === admin.uid ? "✓ " : ""}${admin.label}`}
                  onPress={() => setSuccessor(admin.uid)}
                />
              ))}
              {!!successorUid && (
                <Text style={s.small}>
                  El administrador seleccionado recibirá todos los permisos de
                  propietario. Comprueba su UID en Administración antes de
                  confirmar.
                </Text>
              )}
            </>
          )}
          <Field
            label="Contraseña actual de la cuenta"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
          />
          <Field
            label="Escribe ELIMINAR MI CUENTA"
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize="characters"
            autoCorrect={false}
          />
          {!!error && <Notice error text={error} />}
          <Button
            danger
            title="Confirmar y borrar definitivamente"
            busy={busy}
            disabled={
              !password ||
              confirmation !== "ELIMINAR MI CUENTA" ||
              (role === "owner" && !successorUid)
            }
            onPress={remove}
          />
        </SafetyModal>
      )}
    </Card>
  );
}
