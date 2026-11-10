import { readFile } from "node:fs/promises";
import { before, after, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
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
  deleteField,
  writeBatch,
  runTransaction,
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
async function createFamily(
  uid = "a",
  profile = family,
  start = true,
  mail = false,
) {
  const db = ctx(uid),
    batch = writeBatch(db);
  batch.set(doc(db, "families", uid), profile);
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
  if (mail)
    batch.set(doc(db, "mailEvents", `welcome-${uid}`), {
      uid,
      kind: "welcome",
      levelId: null,
      state: "pending",
      createdAt: serverTimestamp(),
      nextAttemptAt: serverTimestamp(),
    });
  await batch.commit();
  if (start)
    await setDoc(doc(db, "journeys", uid), {
      levelId: "nivel-1",
      startedAt: serverTimestamp(),
    });
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
async function auditedWrite(
  db,
  path,
  data,
  action,
  target,
  actor = data.updatedBy ?? data.senderUid ?? "administrator",
) {
  const a = doc(collection(db, "adminAudit")),
    b = writeBatch(db);
  b.set(doc(db, path), {
    ...data,
    [action === "family.profile.update" ? "adminAuditId" : "auditId"]: a.id,
  });
  b.set(a, {
    actorUid: actor,
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
test("family registration requires a marriage date, while birthdays stay optional", async () => {
  const { marriageDate: _marriageDate, ...missing } = family;
  const invalid = [
    missing,
    { ...family, marriageDate: null },
    { ...family, marriageDate: "" },
    { ...family, marriageDate: 123 },
  ];
  for (const [i, profile] of invalid.entries())
    await assertFails(createFamily(`missing-${i}`, profile));
  await assertSucceeds(createFamily());
});
test("members and administrators cannot clear an existing marriage date", async () => {
  await createFamily();
  for (const marriageDate of [null, "", deleteField()])
    await assertFails(
      updateDoc(doc(ctx("a"), "families", "a"), { marriageDate }),
    );
  const db = ctx("administrator"),
    audit = doc(collection(db, "adminAudit")),
    batch = writeBatch(db);
  batch.set(doc(db, "families", "a"), {
    ...family,
    marriageDate: null,
    adminAuditId: audit.id,
  });
  batch.set(audit, {
    actorUid: "administrator",
    action: "family.profile.update",
    target: "a",
    at: serverTimestamp(),
  });
  await assertFails(batch.commit());
  assert.equal(
    (await getDoc(doc(ctx("a"), "families", "a"))).data().marriageDate,
    family.marriageDate,
  );
});
test("legacy families must complete their marriage date before advancing", async () => {
  await createFamily();
  const { marriageDate: _marriageDate, ...legacy } = family;
  await seed("families/a", legacy);
  await assertFails(complete(ctx("a")));
  await assertSucceeds(setDoc(doc(ctx("a"), "families", "a"), family));
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
        permissions: [
          "families.view",
          "families.edit",
          "messages.send",
          "content.manage",
          "settings.manage",
          "roles.manage",
        ],
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
        permissions: [],
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
        permissions: [],
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
      questions.map((q) => [q.id, "Primera línea\nSegunda línea"]),
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

test("a new family explicitly starts once and cannot reset its daily clock", async () => {
  await createFamily("a", family, false);
  const db = ctx("a"),
    ref = doc(db, "journeys", "a");
  await assertFails(complete(db));
  await assertFails(
    setDoc(ref, {
      levelId: "nivel-1",
      startedAt: Timestamp.fromMillis(Date.now() - 86400000),
    }),
  );
  await assertSucceeds(
    setDoc(ref, { levelId: "nivel-1", startedAt: serverTimestamp() }),
  );
  await assertFails(updateDoc(ref, { startedAt: serverTimestamp() }));
  await assertFails(
    setDoc(doc(ctx("b"), "journeys", "a"), {
      levelId: "nivel-1",
      startedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(complete(db));
});
test("late completion waits a full day after finishing even if the journey began days earlier", async () => {
  await createFamily();
  await complete(ctx("a"));
  await seed("journeys/a", {
    levelId: "nivel-1",
    startedAt: Timestamp.fromMillis(Date.now() - 5 * 86400000),
  });
  const db = ctx("a"),
    old = (
      await getDoc(doc(db, "families", "a", "progress", "nivel-1"))
    ).data();
  const summary = (await getDoc(doc(db, "tracking", "a"))).data();
  const recent = Timestamp.fromMillis(Date.now() - 2 * 3600000);
  await seed("families/a/progress/nivel-1", {
    ...old,
    lastCompletionAt: recent,
  });
  await seed("tracking/a", { ...summary, lastCompletedAt: recent });
  await assertFails(complete(db, "a", old.completions, 1, "reto-2"));
  const yesterday = Timestamp.fromMillis(Date.now() - 25 * 3600000);
  await seed("families/a/progress/nivel-1", {
    ...old,
    lastCompletionAt: yesterday,
  });
  await seed("tracking/a", { ...summary, lastCompletedAt: yesterday });
  await assertSucceeds(complete(db, "a", old.completions, 1, "reto-2"));
});
test("days without completing never skip the pending challenge or allow catching up in one sitting", async () => {
  await createFamily();
  await seed("journeys/a", {
    levelId: "nivel-1",
    startedAt: Timestamp.fromMillis(Date.now() - 7 * 86400000),
  });
  const db = ctx("a");
  await assertFails(complete(db, "a", [], 0, "reto-2"));
  await assertSucceeds(complete(db));
  const saved = (
    await getDoc(doc(db, "families", "a", "progress", "nivel-1"))
  ).data();
  await assertFails(complete(db, "a", saved.completions, 1, "reto-2"));
});
const jpeg = "data:image/jpeg;base64,/9j/AA==";
const privatePortrait = (shareBirthday = true) => ({
  "partner-1": { dataUri: jpeg, shareBirthday },
});
function publicProfile(people = []) {
  return {
    uid: "a",
    alias: "Familia A",
    visible: true,
    shareAnniversary: false,
    shareProgress: false,
    marriageDate: null,
    timezone: family.timezone,
    completedCount: 0,
    finishedCount: 0,
    avatar: null,
    people,
    updatedAt: serverTimestamp(),
  };
}
const person = {
  key: "partner-1",
  index: 0,
  name: family.partner1,
  monthDay: "11-06",
  avatar: jpeg,
};
async function enableBirthday() {
  await createFamily("a", { ...family, partner1BirthDate: "1990-11-06" });
  const db = ctx("a"),
    batch = writeBatch(db);
  batch.set(doc(db, "portraits", "a"), {
    people: privatePortrait(),
    publicPeople: [person],
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, "community", "a"), publicProfile([person]));
  await assertSucceeds(batch.commit());
}
test("personal portraits are private even from administrators", async () => {
  await createFamily();
  await assertSucceeds(
    setDoc(doc(ctx("a"), "portraits", "a"), {
      people: privatePortrait(false),
      updatedAt: serverTimestamp(),
    }),
  );
  await assertSucceeds(getDoc(doc(ctx("a"), "portraits", "a")));
  await assertFails(getDoc(doc(ctx("b"), "portraits", "a")));
  await assertFails(getDoc(doc(ctx("administrator"), "portraits", "a")));
  await assertFails(
    setDoc(doc(ctx("a"), "portraits", "a"), {
      people: {
        "partner-1": {
          dataUri: "data:image/jpeg;base64," + "A".repeat(16000),
          shareBirthday: false,
        },
      },
      updatedAt: serverTimestamp(),
    }),
  );
});
test("only individually authorized birthday details and photos can appear in community", async () => {
  await enableBirthday();
  await assertSucceeds(getDoc(doc(ctx("b"), "community", "a")));
  for (const item of [
    { ...person, name: "Otra persona" },
    { ...person, monthDay: "11-07" },
    { ...person, birthDate: "1990-11-06" },
    { ...person, age: 36 },
    { ...person, avatar: jpeg + "AA" },
  ])
    await assertFails(
      setDoc(doc(ctx("a"), "community", "a"), publicProfile([item])),
    );
});
test("withdrawing an individual's consent must also remove the public birthday", async () => {
  await enableBirthday();
  const db = ctx("a");
  await assertFails(
    setDoc(doc(db, "portraits", "a"), {
      people: privatePortrait(false),
      updatedAt: serverTimestamp(),
    }),
  );
  const batch = writeBatch(db);
  batch.set(doc(db, "portraits", "a"), {
    people: privatePortrait(false),
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, "community", "a"), publicProfile());
  await assertSucceeds(batch.commit());
  assert.deepEqual(
    (await getDoc(doc(ctx("b"), "community", "a"))).data().people,
    [],
  );
});
test("twelve portraits and birthdays support individual activation, photo changes and family edits", async () => {
  const f = {
    ...family,
    partner1BirthDate: "1990-11-06",
    partner2BirthDate: "1989-11-06",
    children: Array.from({ length: 10 }, (_, i) => ({
      id: `child-${i}`,
      name: `Hijo ${i}`,
      kind: "hijo",
      birthDate: "2018-11-06",
    })),
  };
  await createFamily("a", f);
  const members = [
    { key: "partner-1", index: 0, name: f.partner1 },
    { key: "partner-2", index: 1, name: f.partner2 },
    ...f.children.map((c, i) => ({ key: c.id, index: i + 2, name: c.name })),
  ];
  const photos = {};
  const db = ctx("a"),
    published = [];
  for (const member of members) {
    photos[member.key] = { dataUri: jpeg, shareBirthday: false };
    await assertSucceeds(
      setDoc(doc(db, "portraits", "a"), {
        people: photos,
        editKey: member.key,
        publicPeople: [],
        updatedAt: serverTimestamp(),
      }),
    ).catch((e) => {
      throw new Error(`Foto privada ${member.key}: ${e.message}`);
    });
  }
  for (const m of members) {
    photos[m.key].shareBirthday = true;
    published.push({ ...m, monthDay: "11-06", avatar: jpeg });
    const batch = writeBatch(db);
    batch.set(doc(db, "portraits", "a"), {
      people: photos,
      editKey: m.key,
      publicPeople: published,
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "community", "a"), publicProfile(published));
    await assertSucceeds(batch.commit()).catch((e) => {
      throw new Error(`Compartir ${m.key}: ${e.message}`);
    });
  }
  const changed = jpeg + "AA",
    rows = published.map((m) => ({
      ...m,
      avatar: m.key === "partner-1" ? changed : jpeg,
    }));
  const again = writeBatch(db);
  again.set(doc(db, "portraits", "a"), {
    people: {
      ...photos,
      "partner-1": { dataUri: changed, shareBirthday: true },
    },
    editKey: "partner-1",
    publicPeople: rows,
    updatedAt: serverTimestamp(),
  });
  again.set(doc(db, "community", "a"), publicProfile(rows));
  await assertSucceeds(again.commit()).catch((e) => {
    throw new Error(`Cambiar foto: ${e.message}`);
  });
  const edited = rows.map((p) =>
      p.key === "partner-1" ? { ...p, name: "Ana María" } : p,
    ),
    edit = writeBatch(db);
  edit.set(doc(db, "families", "a"), { ...f, partner1: "Ana María" });
  edit.update(doc(db, "tracking", "a"), { lastActivityAt: serverTimestamp() });
  edit.set(doc(db, "portraits", "a"), {
    people: {
      ...photos,
      "partner-1": { dataUri: changed, shareBirthday: true },
    },
    editKey: null,
    publicPeople: edited,
    updatedAt: serverTimestamp(),
  });
  edit.set(doc(db, "community", "a"), publicProfile(edited));
  await assertSucceeds(edit.commit()).catch((e) => {
    throw new Error(`Editar familia: ${e.message}`);
  });
  const withdraw = writeBatch(db);
  withdraw.set(doc(db, "portraits", "a"), {
    people: {
      ...photos,
      "partner-1": { dataUri: changed, shareBirthday: false },
    },
    editKey: "partner-1",
    publicPeople: edited.slice(1),
    updatedAt: serverTimestamp(),
  });
  withdraw.set(doc(db, "community", "a"), publicProfile(edited.slice(1)));
  await assertSucceeds(withdraw.commit());
  assert.equal(
    (await getDoc(doc(ctx("b"), "community", "a"))).data().people.length,
    11,
  );
});
test("email verification status must match the authenticated Firebase claim", async () => {
  await createFamily();
  await assertFails(
    updateDoc(doc(ctx("a"), "tracking", "a"), {
      emailVerified: true,
      lastActivityAt: serverTimestamp(),
    }),
  );
  const verified = env
    .authenticatedContext("a", { email: "a@example.com", email_verified: true })
    .firestore();
  await assertSucceeds(
    updateDoc(doc(verified, "tracking", "a"), {
      emailVerified: true,
      lastActivityAt: serverTimestamp(),
    }),
  );
});

test("portrait edit metadata cannot bypass size, consent or multi-person validation", async () => {
  await createFamily();
  const db = ctx("a"),
    ref = doc(db, "portraits", "a");
  for (const input of [
    { editKey: null, people: privatePortrait(false) },
    { editKey: "partner-2", people: privatePortrait(false) },
    {
      editKey: "partner-1",
      people: {
        ...privatePortrait(false),
        "partner-2": { dataUri: jpeg, shareBirthday: false },
      },
    },
    {
      editKey: "partner-1",
      people: {
        "partner-1": {
          dataUri: "data:image/jpeg;base64," + "A".repeat(16000),
          shareBirthday: false,
        },
      },
    },
  ])
    await assertFails(
      setDoc(ref, { ...input, publicPeople: [], updatedAt: serverTimestamp() }),
    );
  await assertSucceeds(
    setDoc(ref, {
      editKey: "partner-1",
      people: privatePortrait(false),
      publicPeople: [],
      updatedAt: serverTimestamp(),
    }),
  );
});

const optionalPrefs = (enabled = true) => ({ enabled, version: 1 });
test("mail delivery is admin controlled and neither clients nor admins may erase signed unsubscribes", async () => {
  await createFamily();
  await assertFails(
    setDoc(doc(ctx("a"), "emailPreferences", "a"), optionalPrefs()),
  );
  await seed("roles/mailer", {
    role: "admin",
    permissions: ["families.view", "emails.send"],
  });
  const db = ctx("mailer"),
    value = {
      enabled: false,
      version: 1,
      updatedAt: serverTimestamp(),
      updatedBy: "mailer",
    };
  await assertSucceeds(
    auditedWrite(
      db,
      "emailPreferences/a",
      value,
      "email.preferences.update",
      "a",
      "mailer",
    ),
  );
  await assertSucceeds(
    auditedWrite(
      db,
      "emailPreferences/a",
      { ...value, enabled: true, version: 2 },
      "email.preferences.update",
      "a",
      "mailer",
    ),
  );
  await seed("emailPreferences/a", {
    enabled: false,
    unsubscribed: true,
    version: 3,
  });
  await assertFails(
    auditedWrite(
      db,
      "emailPreferences/a",
      { ...value, enabled: true, version: 4, unsubscribed: true },
      "email.preferences.update",
      "a",
      "mailer",
    ),
  );
  await assertFails(
    auditedWrite(
      db,
      "emailPreferences/a",
      { ...value, enabled: true, version: 4, unsubscribed: false },
      "email.preferences.update",
      "a",
      "mailer",
    ),
  );
});
test("email and notification permissions are independent and queue creation never requires an inbox copy", async () => {
  await createFamily();
  await seed("config/email", { enabled: true, paused: false });
  for (const [uid, permission] of [
    ["mailer", "emails.send"],
    ["notifier", "messages.send"],
  ])
    await seed(`roles/${uid}`, {
      role: "admin",
      permissions: ["families.view", permission],
    });
  const message = (uid) => ({
    uid: "a",
    title: "Ánimo",
    body: "Un paso juntos",
    senderUid: uid,
    createdAt: serverTimestamp(),
    state: "pending",
  });
  await assertSucceeds(
    auditedWrite(
      ctx("mailer"),
      "emailQueue/q",
      message("mailer"),
      "email.send",
      "a",
      "mailer",
    ),
  );
  await assertFails(
    auditedWrite(
      ctx("notifier"),
      "emailQueue/q2",
      message("notifier"),
      "email.send",
      "a",
      "notifier",
    ),
  );
  await assertFails(
    auditedWrite(
      ctx("mailer"),
      "emailQueue/forged",
      { ...message("mailer"), to: "other@example.com" },
      "email.send",
      "a",
      "mailer",
    ),
  );
  const { uid, state, ...inbox } = message("notifier");
  await assertSucceeds(
    auditedWrite(
      ctx("notifier"),
      "families/a/inbox/n",
      inbox,
      "message.send",
      "a",
      "notifier",
    ),
  );
  await assertFails(
    auditedWrite(
      ctx("mailer"),
      "families/a/inbox/n2",
      { ...inbox, senderUid: "mailer" },
      "message.send",
      "a",
      "mailer",
    ),
  );
  await assertSucceeds(getDoc(doc(ctx("a"), "emailQueue", "q")));
  await assertFails(getDoc(doc(ctx("b"), "emailQueue", "q")));
  await assertFails(
    setDoc(doc(ctx("a"), "mailJobs", "fake"), { uid: "a", state: "accepted" }),
  );
  await seed("emailPreferences/a", {
    enabled: false,
    unsubscribed: true,
    version: 1,
  });
  await assertFails(
    auditedWrite(
      ctx("mailer"),
      "emailQueue/optout",
      message("mailer"),
      "email.send",
      "a",
      "mailer",
    ),
  );
});
test("email delivery metadata is cleaned only by its family during account deletion", async () => {
  await createFamily();
  await seed("emailQueue/q", { uid: "a", state: "accepted" });
  await seed("mailJobs/j", { uid: "a", state: "accepted" });
  await assertFails(deleteDoc(doc(ctx("a"), "mailJobs", "j")));
  await seed("accountDeletion/a", { requestedAt: Timestamp.now() });
  await assertSucceeds(deleteDoc(doc(ctx("a"), "mailJobs", "j")));
  await assertSucceeds(deleteDoc(doc(ctx("a"), "emailQueue", "q")));
});
test("content-only admin cannot read family profiles, summaries or manage roles", async () => {
  await createFamily();
  await seed("roles/content", {
    role: "admin",
    permissions: ["content.manage"],
  });
  await seed("levels/draft", { ...level, id: "draft", published: false });
  await assertSucceeds(getDoc(doc(ctx("content"), "levels", "draft")));
  await assertFails(getDoc(doc(ctx("content"), "families", "a")));
  await assertFails(getDoc(doc(ctx("content"), "tracking", "a")));
  await assertFails(getDoc(doc(ctx("content"), "roles", "a")));
});
test("family reader cannot edit profiles, send messages, publish content or change configuration", async () => {
  await createFamily();
  await seed("roles/reader", { role: "admin", permissions: ["families.view"] });
  const db = ctx("reader");
  await assertSucceeds(getDoc(doc(db, "families", "a")));
  await assertSucceeds(getDoc(doc(db, "tracking", "a")));
  await assertFails(
    auditedWrite(
      db,
      "families/a",
      { ...family, partner1: "Cambiado" },
      "family.profile.update",
      "a",
      "reader",
    ),
  );
  await assertFails(
    auditedWrite(
      db,
      "families/a/inbox/msg",
      {
        title: "Hola",
        body: "Mensaje",
        senderUid: "reader",
        createdAt: serverTimestamp(),
      },
      "message.send",
      "a",
    ),
  );
  await assertFails(
    auditedWrite(
      db,
      "config/app",
      { version: 1 },
      "app.settings.update",
      "config/app",
    ),
  );
});
test("delegated role managers cannot escalate through omitted fields or grant permissions they do not have", async () => {
  await createFamily();
  await seed("roles/manager", {
    role: "admin",
    permissions: ["families.view", "roles.manage"],
  });
  const db = ctx("manager");
  const role = {
    role: "admin",
    updatedAt: serverTimestamp(),
    updatedBy: "manager",
  };
  await assertFails(auditedWrite(db, "roles/a", role, "role.update", "a"));
  await assertFails(
    auditedWrite(
      db,
      "roles/a",
      { ...role, permissions: ["settings.manage"] },
      "role.update",
      "a",
    ),
  );
  await assertSucceeds(
    auditedWrite(
      db,
      "roles/a",
      { ...role, permissions: ["families.view"] },
      "role.update",
      "a",
    ),
  );
  await assertSucceeds(getDoc(doc(ctx("a"), "tracking", "a")));
  await seed("roles/a", { role: "admin", permissions: ["content.manage"] });
  await assertFails(
    auditedWrite(
      db,
      "roles/a",
      {
        role: "member",
        permissions: [],
        updatedAt: serverTimestamp(),
        updatedBy: "manager",
      },
      "role.update",
      "a",
    ),
  );
});
test("revoking a permission takes effect without changing the existing authentication token", async () => {
  await createFamily();
  await seed("roles/operator", {
    role: "admin",
    permissions: ["families.view"],
  });
  const db = ctx("operator");
  await assertSucceeds(getDoc(doc(db, "families", "a")));
  await seed("roles/operator", { role: "admin", permissions: [] });
  await assertFails(getDoc(doc(db, "families", "a")));
});

test("settings operator configures mail in app but cannot activate the backend, store API keys or force consent", async () => {
  await createFamily();
  await seed("roles/settings", {
    role: "admin",
    permissions: ["settings.manage"],
  });
  const db = ctx("settings");
  const settings = {
    version: 1,
    paused: false,
    fromName: "ENTRE DOS",
    fromEmail: "",
    replyTo: "sevenawesome.srl@gmail.com",
    welcomeEnabled: true,
    completionEnabled: true,
    adminMessagesEnabled: true,
    dailyLimit: 90,
    monthlyLimit: 2700,
    subjectPrefix: "",
    welcomeTemplate: "Bienvenidos {family}",
    completionTemplate: "Felicidades {family}: {levelTitle}",
  };
  await assertSucceeds(
    auditedWrite(
      db,
      "config/email",
      settings,
      "email.settings.update",
      "config/email",
      "settings",
    ),
  );
  const old = (await getDoc(doc(db, "config", "email"))).data();
  await assertFails(
    auditedWrite(
      db,
      "config/email",
      { ...old, version: 2, enabled: true },
      "email.settings.update",
      "config/email",
      "settings",
    ),
  );
  await assertFails(
    auditedWrite(
      db,
      "config/email",
      { ...old, version: 2, resendApiKey: "not-a-real-key" },
      "email.settings.update",
      "config/email",
      "settings",
    ),
  );
  await assertSucceeds(
    auditedWrite(
      db,
      "config/email",
      { ...old, version: 2, subjectPrefix: "Familias" },
      "email.settings.update",
      "config/email",
      "settings",
    ),
  );
  await assertFails(getDoc(doc(db, "families", "a")));
  await assertFails(setDoc(doc(db, "emailPreferences", "a"), optionalPrefs()));
});

test("welcome event requires the initial registration batch, is immutable and cannot target another family", async () => {
  const db = ctx("a"),
    event = {
      uid: "a",
      kind: "welcome",
      levelId: null,
      state: "pending",
      createdAt: serverTimestamp(),
      nextAttemptAt: serverTimestamp(),
    };
  await assertFails(setDoc(doc(db, "mailEvents", "welcome-a"), event));
  await assertSucceeds(createFamily("a", family, true, true));
  await assertFails(setDoc(doc(db, "mailEvents", "welcome-a"), event));
  await assertFails(
    setDoc(doc(db, "mailEvents", "welcome-b"), { ...event, uid: "b" }),
  );
  await assertFails(
    setDoc(doc(db, "mailEvents", "level-a-nivel-1"), {
      ...event,
      kind: "levelCompleted",
      levelId: "nivel-1",
    }),
  );
  await assertFails(
    updateDoc(doc(db, "mailEvents", "welcome-a"), { state: "pending" }),
  );
});

test("owner may grant all seven permissions together and revoke admin access", async () => {
  await createFamily();
  const db = ctx("owner");
  const permissions = [
    "families.view",
    "families.edit",
    "messages.send",
    "emails.send",
    "content.manage",
    "settings.manage",
    "roles.manage",
  ];
  await assertSucceeds(
    auditedWrite(
      db,
      "roles/a",
      {
        role: "admin",
        permissions,
        updatedAt: serverTimestamp(),
        updatedBy: "owner",
      },
      "role.update",
      "a",
      "owner",
    ),
  );
  await assertSucceeds(
    auditedWrite(
      db,
      "roles/a",
      {
        role: "member",
        permissions: [],
        updatedAt: serverTimestamp(),
        updatedBy: "owner",
      },
      "role.update",
      "a",
      "owner",
    ),
  );
});

test("only public branding text is visible before login, while changes require configuration permission and audit", async () => {
  await seed("roles/settings", {
    role: "admin",
    permissions: ["settings.manage"],
  });
  const db = ctx("settings"),
    anon = env.unauthenticatedContext().firestore();
  await assertSucceeds(
    auditedWrite(
      db,
      "config/branding",
      { byline: "By Hogar y Familia", version: 1 },
      "branding.settings.update",
      "config/branding",
      "settings",
    ),
  );
  assert.equal(
    (await assertSucceeds(getDoc(doc(anon, "config", "branding")))).data()
      .byline,
    "By Hogar y Familia",
  );
  await seed("config/app", { announcement: "Solo cuentas registradas" });
  await assertFails(getDoc(doc(anon, "config", "app")));
  await assertFails(
    setDoc(doc(ctx("a"), "config", "branding"), {
      byline: "Cambio",
      version: 2,
      auditId: "fake",
    }),
  );
  await seed("roles/mailer", {
    role: "admin",
    permissions: ["families.view", "emails.send"],
  });
  await assertFails(
    auditedWrite(
      ctx("mailer"),
      "config/branding",
      { byline: "Cambio", version: 2 },
      "branding.settings.update",
      "config/branding",
      "mailer",
    ),
  );
  await assertSucceeds(
    auditedWrite(
      db,
      "config/branding",
      { byline: "", version: 2 },
      "branding.settings.update",
      "config/branding",
      "settings",
    ),
  );
  await assertFails(
    auditedWrite(
      db,
      "config/branding",
      { byline: "Valor desactualizado", version: 2 },
      "branding.settings.update",
      "config/branding",
      "settings",
    ),
  );
  for (const change of [
    { byline: "x".repeat(121) },
    { byline: "Dos\nlíneas" },
    { privateKey: "not-a-key" },
  ])
    await assertFails(
      auditedWrite(
        db,
        "config/branding",
        { byline: "Firma", version: 3, ...change },
        "branding.settings.update",
        "config/branding",
        "settings",
      ),
    );
});

test("the owner can create and update branding in an audited transaction and stale edits cannot overwrite it", async () => {
  const db = ctx("owner");
  async function save(byline, expectedVersion) {
    const ref = doc(db, "config", "branding");
    const audit = doc(collection(db, "adminAudit"));
    return runTransaction(db, async (tx) => {
      const old = await tx.get(ref);
      assert.equal(
        old.data()?.version ?? 0,
        expectedVersion,
        "version conflict",
      );
      const version = expectedVersion + 1;
      tx.set(ref, { byline, version, auditId: audit.id });
      tx.set(audit, {
        actorUid: "owner",
        action: "branding.settings.update",
        target: "config/branding",
        at: serverTimestamp(),
      });
      return version;
    });
  }
  assert.equal(
    await assertSucceeds(save("By Equipo de Hogar y Familia", 0)),
    1,
  );
  assert.equal(
    await assertSucceeds(save("By Departamento de Hogar y Familia", 1)),
    2,
  );
  await assert.rejects(save("Un cambio desactualizado", 1), /version conflict/);
  const saved = await getDoc(
    doc(env.unauthenticatedContext().firestore(), "config", "branding"),
  );
  assert.equal(saved.data().byline, "By Departamento de Hogar y Familia");
  assert.equal(saved.data().version, 2);
});

test("deletion jobs are server-only and a marked account cannot receive an administrative role", async () => {
  await createFamily("a");
  await seed("accountDeletion/a", {
    requestedAt: Timestamp.now(),
    source: "administration",
  });
  await assertFails(
    auditedWrite(
      ctx("owner"),
      "roles/a",
      {
        role: "admin",
        permissions: ["families.view"],
        updatedAt: serverTimestamp(),
        updatedBy: "owner",
      },
      "role.update",
      "a",
      "owner",
    ),
  );
  const path = "adminDeletionJobs/00000000-0000-0000-0000-000000000000";
  await seed(path, { actorUid: "owner", targets: ["a"], state: "queued" });
  for (const db of [
    ctx("owner"),
    ctx("administrator"),
    ctx("a"),
    env.unauthenticatedContext().firestore(),
  ]) {
    await assertFails(getDoc(doc(db, path)));
    await assertFails(
      setDoc(doc(db, path), { state: "queued", targets: ["owner"] }),
    );
    await assertFails(deleteDoc(doc(db, path)));
  }
});
