import { useEffect, useState } from "react";
import { Text } from "react-native";
import { router } from "expo-router";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { friendlyError } from "../services/api";
import { useApp, store } from "../store";
import {
  Screen,
  Heading,
  Card,
  Button,
  Notice,
  s,
  colors,
} from "../components/ui";
interface Greeting {
  id: string;
  anniversaryDate: string;
  years: number;
  senderAlias: string;
  body: string;
}
export default function AnniversaryMemories() {
  const { uid, demo } = useApp();
  const [messages, setMessages] = useState<Greeting[]>([]),
    [cursor, setCursor] = useState<QueryDocumentSnapshot>(),
    [more, setMore] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function load(append = false) {
    if (!uid || demo) return;
    setBusy(true);
    setError("");
    try {
      const page = await getDocs(
        query(
          collection(db!, "anniversaryMessages"),
          where("recipientUid", "==", uid),
          orderBy("createdAt", "desc"),
          ...(append && cursor ? [startAfter(cursor)] : []),
          limit(20),
        ),
      );
      const items = page.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Greeting,
      );
      if (store.getState().app.uid !== uid) return;
      setMessages((old) =>
        append
          ? [...old, ...items.filter((i) => !old.some((o) => o.id === i.id))]
          : items,
      );
      setCursor(page.docs.at(-1));
      setMore(page.size === 20);
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void Promise.resolve().then(() => load());
  }, [uid, demo]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Screen>
      <Button
        secondary
        title="Volver a nuestros recuerdos"
        onPress={() => router.replace("/memories")}
      />
      <Heading
        eyebrow="PALABRAS QUE PERMANECEN"
        title="Nuestros aniversarios."
        subtitle="Un recuerdo privado de las familias que celebraron con ustedes. Una felicitación por familia en cada aniversario."
      />
      {demo && (
        <Notice text="Demostración · las felicitaciones reales aparecerán aquí al recibirlas. No se envían mensajes desde esta prueba." />
      )}
      {!!error && <Notice error text={error} />}
      {!busy && !messages.length && (
        <Card style={{ backgroundColor: colors.champagne }}>
          <Text style={s.sectionTitle}>
            Aquí guardaremos sus felicitaciones
          </Text>
          <Text style={s.body}>
            El día de su aniversario, las familias de Comunidad podrán
            dedicarles unas palabras si ustedes comparten su aniversario. Podrán
            volver a leerlas aquí, incluso en los años siguientes.
          </Text>
        </Card>
      )}
      {messages.map((message, index) => (
        <Card key={message.id}>
          {(index === 0 ||
            messages[index - 1].anniversaryDate !==
              message.anniversaryDate) && (
            <>
              <Text style={s.eyebrow}>
                ANIVERSARIO ·{" "}
                {message.anniversaryDate.split("-").reverse().join("/")}
              </Text>
              <Text style={s.sectionTitle}>
                {message.years} {message.years === 1 ? "año" : "años"}{" "}
                eligiéndose
              </Text>
            </>
          )}
          <Text style={[s.label, { color: colors.love }]}>
            {message.senderAlias}
          </Text>
          <Text style={s.body}>{message.body}</Text>
        </Card>
      ))}
      {more && (
        <Button
          secondary
          busy={busy}
          title="Leer felicitaciones anteriores"
          onPress={() => load(true)}
        />
      )}
      {!demo && (
        <Button
          secondary
          busy={busy}
          title="Actualizar felicitaciones"
          onPress={() => load()}
        />
      )}
    </Screen>
  );
}
