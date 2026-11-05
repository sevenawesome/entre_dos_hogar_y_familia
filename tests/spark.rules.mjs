import { readFile } from "node:fs/promises";
import { before, after, beforeEach, test } from "node:test";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
  query,
  where,
} from "firebase/firestore";
let env;
const family = {
  name: "Familia A",
  partner1: "Ana",
  partner2: "Luis",
  children: [],
  timezone: "America/La_Paz",
  marriageDate: "2016-11-08",
};
const level = {
  id: "nivel-1",
  order: 1,
  title: "Primer nivel",
  subtitle: "Juntos",
  description: "Dos retos de prueba",
  published: true,
  prerequisiteId: null,
  challenges: [
    { id: "reto-1", order: 1 },
    { id: "reto-2", order: 2 },
  ],
  questions: [{ id: "q1", label: "¿Qué aprendimos?" }],
  questionIds: ["q1"],
};
const ctx = (uid) =>
  env
    .authenticatedContext(uid, {
      email: `${uid}@example.com`,
      auth_time: Math.floor(Date.now() / 1000),
    })
    .firestore();
async function seed(path, data) {
  await env.withSecurityRulesDisabled(async (c) =>
    setDoc(doc(c.firestore(), path), data),
  );
}
async function createFamily(uid = "a") {
  const db = ctx(uid),
    batch = writeBatch(db);
  batch.set(doc(db, "families", uid), family);
  batch.set(doc(db, "tracking", uid), {
    uid,
    familyName: family.name,
    email: `${uid}@example.com`,
    joinedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
    lastCompletedAt: null,
    levelId: "",
    levelOrder: 0,
    completedCount: 0,
    totalCompleted: 0,
    finishedCount: 0,
  });
  await batch.commit();
}
function complete(db, uid = "a", old = [], total = 0, id = "reto-1") {
  const p = {
    levelId: "nivel-1",
    completions: [
      ...old,
      {
        challengeId: id,
        completedAt: new Date().toISOString(),
        note: "Privada",
      },
    ],
    answers: {},
    finishedAt: null,
    nextAvailableAt: new Date(Date.now() + 86400000).toISOString(),
    lastCompletionAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const batch = writeBatch(db);
  batch.set(doc(db, "families", uid, "progress", "nivel-1"), p);
  batch.update(doc(db, "tracking", uid), {
    lastActivityAt: serverTimestamp(),
    lastCompletedAt: serverTimestamp(),
    levelId: "nivel-1",
    levelOrder: 1,
    completedCount: old.length + 1,
    totalCompleted: total + 1,
  });
  return batch.commit();
}
async function auditedWrite(db, path, data, action, target) {
  const a = doc(collection(db, "adminAudit")),
    b = writeBatch(db);
  b.set(doc(db, path), { ...data, auditId: a.id });
  b.set(a, {
    actorUid: "administrator",
    action,
    target,
    at: serverTimestamp(),
  });
  return b.commit();
}
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-entre-dos-rules",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile("firestore.rules", "utf8"),
    },
  });
});
after(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await seed("levels/nivel-1", level);
  await seed("roles/administrator", { role: "admin" });
  await seed("roles/owner", { role: "owner" });
});
test("anonymous cannot read families, progress or community", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDocs(collection(db, "families")));
  await assertFails(getDocs(collection(db, "community")));
});
test("family and server-timestamp summary are created atomically", async () => {
  await assertSucceeds(createFamily());
  await assertFails(
    setDoc(doc(ctx("b"), "tracking", "b"), { totalCompleted: 900 }),
  );
});
test("first completion succeeds with a paired authoritative summary", async () => {
  await createFamily();
  await assertSucceeds(complete(ctx("a")));
});
test("another family cannot read private notes or profile", async () => {
  await createFamily();
  await complete(ctx("a"));
  await assertFails(getDoc(doc(ctx("b"), "families", "a")));
  await assertFails(
    getDoc(doc(ctx("b"), "families", "a", "progress", "nivel-1")),
  );
});
test("admin can read family and summary but never private progress", async () => {
  await createFamily();
  await complete(ctx("a"));
  await assertSucceeds(getDoc(doc(ctx("administrator"), "families", "a")));
  await assertSucceeds(getDoc(doc(ctx("administrator"), "tracking", "a")));
  await assertFails(
    getDoc(doc(ctx("administrator"), "families", "a", "progress", "nivel-1")),
  );
});
test("cannot skip challenge or forge aggregate progress", async () => {
  await createFamily();
  await assertFails(complete(ctx("a"), "a", [], 0, "reto-2"));
  await assertFails(
    updateDoc(doc(ctx("a"), "tracking", "a"), {
      totalCompleted: 999,
      lastActivityAt: serverTimestamp(),
    }),
  );
});
test("second challenge within 24 hours is rejected by server rules", async () => {
  await createFamily();
  await complete(ctx("a"));
  const p = (
    await getDoc(doc(ctx("a"), "families", "a", "progress", "nivel-1"))
  ).data();
  await assertFails(complete(ctx("a"), "a", p.completions, 1, "reto-2"));
});
test("changing the first completion while appending is rejected", async () => {
  await createFamily();
  await complete(ctx("a"));
  await seed("tracking/a", {
    ...(await getDoc(doc(ctx("a"), "tracking", "a"))).data(),
    lastCompletedAt: Timestamp.fromMillis(Date.now() - 2 * 86400000),
  });
  await assertFails(
    complete(
      ctx("a"),
      "a",
      [{ challengeId: "reto-1", completedAt: "fake", note: "rewrite" }],
      1,
      "reto-2",
    ),
  );
});
test("second completion after cooldown and questionnaire can finish level", async () => {
  await createFamily();
  await complete(ctx("a"));
  const p = (
    await getDoc(doc(ctx("a"), "families", "a", "progress", "nivel-1"))
  ).data();
  await seed("tracking/a", {
    ...(await getDoc(doc(ctx("a"), "tracking", "a"))).data(),
    lastCompletedAt: Timestamp.fromMillis(Date.now() - 2 * 86400000),
  });
  await assertSucceeds(complete(ctx("a"), "a", p.completions, 1, "reto-2"));
  const db = ctx("a"),
    b = writeBatch(db);
  b.update(doc(db, "families", "a", "progress", "nivel-1"), {
    answers: { q1: "Aprendimos a escucharnos" },
    finishedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
  b.update(doc(db, "tracking", "a"), {
    finishedCount: 1,
    lastActivityAt: serverTimestamp(),
  });
  await assertSucceeds(b.commit());
});
test("level cannot finish before every challenge", async () => {
  await createFamily();
  await complete(ctx("a"));
  const db = ctx("a"),
    b = writeBatch(db);
  b.update(doc(db, "families", "a", "progress", "nivel-1"), {
    answers: { q1: "Respuesta" },
    finishedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
  b.update(doc(db, "tracking", "a"), {
    finishedCount: 1,
    lastActivityAt: serverTimestamp(),
  });
  await assertFails(b.commit());
});
test("cannot self promote or grant access as a normal member", async () => {
  await createFamily();
  await assertFails(setDoc(doc(ctx("a"), "roles", "a"), { role: "admin" }));
  await assertFails(setDoc(doc(ctx("a"), "roles", "b"), { role: "admin" }));
});
test("admin can grant and revoke another account with an immutable audit", async () => {
  await createFamily();
  const db = ctx("administrator");
  await assertSucceeds(
    auditedWrite(
      db,
      "roles/a",
      {
        role: "admin",
        updatedAt: serverTimestamp(),
        updatedBy: "administrator",
      },
      "role.update",
      "a",
    ),
  );
  await assertSucceeds(getDocs(collection(ctx("a"), "families")));
  await assertSucceeds(
    auditedWrite(
      db,
      "roles/a",
      {
        role: "member",
        updatedAt: serverTimestamp(),
        updatedBy: "administrator",
      },
      "role.update",
      "a",
    ),
  );
  await assertFails(getDocs(collection(ctx("a"), "families")));
});
test("owner cannot be demoted through the app", async () => {
  await createFamily("owner");
  await assertFails(
    auditedWrite(
      ctx("administrator"),
      "roles/owner",
      {
        role: "member",
        updatedAt: serverTimestamp(),
        updatedBy: "administrator",
      },
      "role.update",
      "owner",
    ),
  );
});
test("targeted message requires admin plus audit and is private to recipient", async () => {
  await createFamily();
  const path = "families/a/inbox/message-1",
    payload = {
      title: "Un momento para ustedes",
      body: "Les acompañamos",
      senderUid: "administrator",
      createdAt: serverTimestamp(),
    };
  await assertSucceeds(
    auditedWrite(ctx("administrator"), path, payload, "message.send", "a"),
  );
  await assertSucceeds(getDoc(doc(ctx("a"), path)));
  await assertFails(getDoc(doc(ctx("b"), path)));
  await assertFails(setDoc(doc(ctx("b"), path), payload));
});
test("private community profile does not leak and public projection excludes intimate fields", async () => {
  await createFamily();
  const profile = {
    uid: "a",
    alias: "Nuestro hogar",
    visible: false,
    shareAnniversary: false,
    shareProgress: false,
    marriageDate: null,
    timezone: family.timezone,
    completedCount: 0,
    finishedCount: 0,
    avatar: null,
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(setDoc(doc(ctx("a"), "community", "a"), profile));
  await assertFails(getDoc(doc(ctx("b"), "community", "a")));
  await assertSucceeds(
    setDoc(doc(ctx("a"), "community", "a"), {
      ...profile,
      visible: true,
      shareAnniversary: true,
      marriageDate: family.marriageDate,
    }),
  );
  await assertSucceeds(
    getDocs(
      query(collection(ctx("b"), "community"), where("visible", "==", true)),
    ),
  );
  await assertFails(
    setDoc(doc(ctx("a"), "community", "a"), {
      ...profile,
      visible: true,
      children: [{ name: "private" }],
    }),
  );
});
test("public counts cannot be inflated and private anniversaries cannot be published accidentally", async () => {
  await createFamily();
  const p = {
    uid: "a",
    alias: "Nuestro hogar",
    visible: true,
    shareAnniversary: false,
    shareProgress: true,
    marriageDate: null,
    timezone: family.timezone,
    completedCount: 999,
    finishedCount: 0,
    avatar: null,
    updatedAt: serverTimestamp(),
  };
  await assertFails(setDoc(doc(ctx("a"), "community", "a"), p));
  await assertFails(
    setDoc(doc(ctx("a"), "community", "a"), {
      ...p,
      completedCount: 0,
      marriageDate: family.marriageDate,
    }),
  );
});
test("small avatar can be shared atomically; oversized avatar is rejected", async () => {
  await createFamily();
  const db = ctx("a"),
    image = "data:image/jpeg;base64,/9j/AA==",
    b = writeBatch(db);
  b.set(doc(db, "avatars", "a"), {
    dataUri: image,
    updatedAt: serverTimestamp(),
  });
  b.set(doc(db, "community", "a"), {
    uid: "a",
    alias: "Nuestra familia",
    visible: true,
    shareAnniversary: false,
    shareProgress: false,
    marriageDate: null,
    timezone: family.timezone,
    completedCount: 0,
    finishedCount: 0,
    avatar: image,
    updatedAt: serverTimestamp(),
  });
  await assertSucceeds(b.commit());
  await assertFails(
    setDoc(doc(db, "avatars", "a"), {
      dataUri: "data:image/jpeg;base64," + "A".repeat(45000),
      updatedAt: serverTimestamp(),
    }),
  );
});
test("draft levels stay hidden from members", async () => {
  await seed("levels/draft", { ...level, id: "draft", published: false });
  await assertFails(getDoc(doc(ctx("a"), "levels", "draft")));
  await assertSucceeds(getDoc(doc(ctx("administrator"), "levels", "draft")));
});
test("admin cannot publish without an audit or alter published challenges", async () => {
  await assertFails(
    setDoc(doc(ctx("administrator"), "levels", "new"), { ...level, id: "new" }),
  );
  await seed("levelOrders/1", { levelId: "nivel-1" });
  await assertFails(
    auditedWrite(
      ctx("administrator"),
      "levels/nivel-1",
      { ...level, challenges: [{ id: "replacement", order: 1 }] },
      "level.save",
      "nivel-1",
    ),
  );
});
test("deletion marker blocks future writes while allowing own cleanup", async () => {
  await createFamily();
  await complete(ctx("a"));
  const db = ctx("a");
  await assertSucceeds(
    setDoc(doc(db, "accountDeletion", "a"), { requestedAt: serverTimestamp() }),
  );
  await assertFails(setDoc(doc(db, "families", "a"), family));
  await assertSucceeds(
    deleteDoc(doc(db, "families", "a", "progress", "nivel-1")),
  );
  await assertSucceeds(deleteDoc(doc(db, "families", "a")));
});
test("fifty challenges and six final answers fit the rules evaluation budget", async () => {
  await createFamily();
  const challenges = Array.from({ length: 50 }, (_, i) => ({
      id: `reto-${i + 1}`,
      order: i + 1,
    })),
    questions = Array.from({ length: 6 }, (_, i) => ({
      id: `q${i + 1}`,
      label: "Pregunta",
    }));
  await seed("levels/nivel-1", {
    ...level,
    challenges,
    questions,
    questionIds: questions.map((q) => q.id),
  });
  const completions = challenges.slice(0, 49).map((c) => ({
      challengeId: c.id,
      completedAt: "2026-01-01T00:00:00Z",
      note: "",
    })),
    oldTime = Timestamp.fromMillis(Date.now() - 2 * 86400000);
  await seed("families/a/progress/nivel-1", {
    levelId: "nivel-1",
    completions,
    answers: {},
    finishedAt: null,
    nextAvailableAt: null,
    lastCompletionAt: oldTime,
    updatedAt: oldTime,
  });
  const summary = (await getDoc(doc(ctx("a"), "tracking", "a"))).data();
  await seed("tracking/a", {
    ...summary,
    lastCompletedAt: oldTime,
    levelId: "nivel-1",
    levelOrder: 1,
    completedCount: 49,
    totalCompleted: 49,
  });
  await assertSucceeds(complete(ctx("a"), "a", completions, 49, "reto-50"));
  const db = ctx("a"),
    b = writeBatch(db);
  b.update(doc(db, "families", "a", "progress", "nivel-1"), {
    answers: Object.fromEntries(
      questions.map((q) => [q.id, "Nuestra respuesta"]),
    ),
    finishedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
  b.update(doc(db, "tracking", "a"), {
    finishedCount: 1,
    lastActivityAt: serverTimestamp(),
  });
  await assertSucceeds(b.commit());
});
test("a family profile with ten children fits the validation budget", async () => {
  const db = ctx("a"),
    f = {
      ...family,
      children: Array.from({ length: 10 }, (_, i) => ({
        id: `child-${i}`,
        name: `Hijo ${i}`,
        kind: "hijo",
        birthDate: "2018-11-08",
      })),
    };
  await assertSucceeds(setDoc(doc(db, "families", "a"), f));
});
test("admin can publish a valid new level and update settings with audited transactions", async () => {
  const db = ctx("administrator"),
    a = doc(collection(db, "adminAudit")),
    b = writeBatch(db),
    newLevel = { ...level, id: "nivel-2", order: 2, prerequisiteId: "nivel-1" };
  b.set(doc(db, "levelOrders", "2"), { levelId: "nivel-2" });
  b.set(doc(db, "levels", "nivel-2"), { ...newLevel, auditId: a.id });
  b.set(a, {
    actorUid: "administrator",
    action: "level.save",
    target: "nivel-2",
    at: serverTimestamp(),
  });
  await assertSucceeds(b.commit());
  await assertSucceeds(
    auditedWrite(
      db,
      "config/app",
      {
        version: 1,
        announcement: "Bienvenidos",
        endTitle: "Lo conseguimos",
        endMessage: "Conserven sus hábitos",
        newLevelTitle: "Un nuevo capítulo",
        supportEmail: "",
        supportUrl: "https://www.sevenawesome.com/",
        notificationsEnabled: true,
      },
      "app.settings.update",
      "config/app",
    ),
  );
});
test("private profile editing and admin pause require correct audits", async () => {
  await createFamily();
  const db = ctx("administrator"),
    audit = doc(collection(db, "adminAudit")),
    b = writeBatch(db);
  b.set(doc(db, "families", "a"), {
    ...family,
    name: "Familia acompañada",
    adminAuditId: audit.id,
  });
  b.set(audit, {
    actorUid: "administrator",
    action: "family.profile.update",
    target: "a",
    at: serverTimestamp(),
  });
  await assertSucceeds(b.commit());
  await assertSucceeds(
    auditedWrite(
      db,
      "familyControls/a",
      { remindersPaused: true },
      "family.reminders.update",
      "a",
    ),
  );
  await assertFails(
    setDoc(doc(ctx("a"), "familyControls", "a"), { remindersPaused: false }),
  );
});
test("thirty final questions stay within the rules execution budget", async () => {
  await createFamily();
  const questions = Array.from({ length: 30 }, (_, i) => ({
      id: `q${i}`,
      label: "Pregunta",
    })),
    time = Timestamp.fromMillis(Date.now() - 2 * 86400000),
    completions = level.challenges.map((c) => ({
      challengeId: c.id,
      completedAt: "2026-01-01T00:00:00Z",
      note: "",
    }));
  await seed("levels/nivel-1", {
    ...level,
    questions,
    questionIds: questions.map((q) => q.id),
  });
  await seed("families/a/progress/nivel-1", {
    levelId: "nivel-1",
    completions,
    answers: {},
    finishedAt: null,
    nextAvailableAt: null,
    lastCompletionAt: time,
    updatedAt: time,
  });
  await seed("tracking/a", {
    ...(await getDoc(doc(ctx("a"), "tracking", "a"))).data(),
    lastCompletedAt: time,
    levelId: "nivel-1",
    levelOrder: 1,
    completedCount: 2,
    totalCompleted: 2,
  });
  const db = ctx("a"),
    b = writeBatch(db);
  b.update(doc(db, "families", "a", "progress", "nivel-1"), {
    answers: Object.fromEntries(
      questions.map((q) => [q.id, "Primera l�nea\nSegunda l�nea"]),
    ),
    finishedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  });
  b.update(doc(db, "tracking", "a"), {
    finishedCount: 1,
    lastActivityAt: serverTimestamp(),
  });
  await assertSucceeds(b.commit());
});

test("final answers reject missing, empty, oversized and non-text values", async () => {
  await createFamily();
  const time = Timestamp.fromMillis(Date.now() - 2 * 86400000),
    completions = level.challenges.map((c) => ({
      challengeId: c.id,
      completedAt: "2026-01-01T00:00:00Z",
      note: "",
    }));
  await seed("families/a/progress/nivel-1", {
    levelId: "nivel-1",
    completions,
    answers: {},
    finishedAt: null,
    nextAvailableAt: null,
    lastCompletionAt: time,
    updatedAt: time,
  });
  await seed("tracking/a", {
    ...(await getDoc(doc(ctx("a"), "tracking", "a"))).data(),
    lastCompletedAt: time,
    levelId: "nivel-1",
    levelOrder: 1,
    completedCount: 2,
    totalCompleted: 2,
  });
  for (const answers of [
    {},
    { q1: "" },
    { q1: "a".repeat(2001) },
    { q1: 123 },
    { q1: true },
    { wrong: "Respuesta" },
  ]) {
    const db = ctx("a"),
      b = writeBatch(db);
    b.update(doc(db, "families", "a", "progress", "nivel-1"), {
      answers,
      finishedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
    b.update(doc(db, "tracking", "a"), {
      finishedCount: 1,
      lastActivityAt: serverTimestamp(),
    });
    await assertFails(b.commit());
  }
});
