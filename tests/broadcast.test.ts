import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const {
  deliveryCommit,
  commitDeliveryOnce,
  prepareBroadcastRecipients,
  parseBroadcastDraft,
  runBroadcast,
} = require("../functions/lib/src/domain/broadcast.js");
const input = {
  projectId: "demo-entre-dos",
  actor: "admin",
  uid: "family",
  operationId: "abcdefghijklmnopqrst",
  channel: "email",
  title: " Hola ",
  body: " Comunidad ",
  attachments: [],
};
const campaign = () => ({
  id: input.operationId,
  actor: "admin",
  channel: "email",
  title: "Hola",
  body: "Comunidad",
  attachments: [],
  recipients: [
    { uid: "a", name: "A", email: "a@example.com" },
    { uid: "b", name: "B", email: "b@example.com" },
  ],
  completed: [],
  failures: {},
  createdAt: "2026-11-17T12:00:00Z",
});

test("broadcast audience deduplicates families and excludes unverified, disabled and unsubscribed email recipients", async () => {
  const rows = ["a", "a", "b", "c", "d"].map((uid) => ({
    uid,
    email: uid + "@example.com",
    family: { name: uid },
    summary: { emailVerified: uid !== "d" },
  }));
  let calls = 0;
  const status = async (uid: string) => {
    calls++;
    return { enabled: uid !== "b", unsubscribed: uid === "c" };
  };
  const mail = await prepareBroadcastRecipients(rows, "email", status);
  assert.deepEqual(
    mail.recipients.map((r: { uid: string }) => r.uid),
    ["a"],
  );
  assert.equal(mail.excluded, 3);
  assert.equal(calls, 3);
  const notices = await prepareBroadcastRecipients(
    rows,
    "notification",
    async () => {
      throw Error("Notification must not depend on mail consent");
    },
  );
  assert.equal(notices.recipients.length, 4);
});
test("broadcast creates only immutable recipient and audit documents with atomic server timestamps", () => {
  const body = deliveryCommit(input);
  assert.equal(body.writes.length, 2);
  assert.match(
    body.writes[0].update.name,
    /emailQueue\/broadcast-email-admin-abcdefghijklmnopqrst-family$/,
  );
  for (const write of body.writes) {
    assert.deepEqual(write.currentDocument, { exists: false });
    assert.equal(write.updateTransforms[0].setToServerValue, "REQUEST_TIME");
  }
  assert.equal(body.writes[0].update.fields.title.stringValue, "Hola");
  const notice = deliveryCommit({ ...input, channel: "notification" });
  assert.match(
    notice.writes[0].update.name,
    /families\/family\/inbox\/broadcast-notification-/,
  );
  assert.equal(notice.writes[0].update.fields.state, undefined);
  assert.notEqual(notice.writes[0].update.name, body.writes[0].update.name);
  for (const patch of [
    { uid: "bad/path" },
    { actor: "" },
    { operationId: "../other" },
    { channel: "other" },
    { body: "" },
    { attachments: [{ name: "bad.exe" }] },
  ])
    assert.throws(() => deliveryCommit({ ...input, ...patch }));
});
test("create-only retries accept only ALREADY_EXISTS, never permission or aborted errors", async () => {
  const created = await commitDeliveryOnce(
    input,
    "user-id-token",
    async (url: string, options: RequestInit) => {
      assert.equal(
        url,
        "https://firestore.googleapis.com/v1/projects/demo-entre-dos/databases/(default)/documents:commit",
      );
      assert.equal(
        (options.headers as Record<string, string>).Authorization,
        "Bearer user-id-token",
      );
      return Response.json({});
    },
  );
  assert.equal(created, "created");
  assert.equal(
    await commitDeliveryOnce(input, "token", async () =>
      Response.json({ error: { status: "ALREADY_EXISTS" } }, { status: 409 }),
    ),
    "existing",
  );
  for (const [code, status] of [
    ["PERMISSION_DENIED", 403],
    ["ABORTED", 409],
    ["UNAVAILABLE", 503],
  ] as const)
    await assert.rejects(
      commitDeliveryOnce(input, "token", async () =>
        Response.json({ error: { status: code } }, { status }),
      ),
    );
});
test("interrupted broadcasts persist before delivery and resume without repeating completed families", async () => {
  const sent: string[] = [],
    saved: any[] = [];
  let stopped = false;
  const first = await runBroadcast(
    campaign(),
    async (r: { uid: string }) => {
      assert.ok(saved.length);
      sent.push(r.uid);
    },
    async (state: unknown) => {
      saved.push(structuredClone(state));
      if ((state as { completed: string[] }).completed.length === 1)
        stopped = true;
    },
    () => stopped,
  );
  assert.deepEqual(first.completed, ["a"]);
  const final = await runBroadcast(
    first,
    async (r: { uid: string }) => {
      sent.push(r.uid);
    },
    async () => {},
  );
  assert.deepEqual(final.completed, ["a", "b"]);
  assert.deepEqual(sent, ["a", "b"]);
  let delivered = false;
  await assert.rejects(
    runBroadcast(
      campaign(),
      async () => {
        delivered = true;
      },
      async () => {
        throw Error("Storage unavailable");
      },
    ),
  );
  assert.equal(delivered, false);
});
test("a lost response is retried with the same campaign identity and local drafts are scoped to actor and channel", async () => {
  let attempts = 0;
  const remote = new Set<string>();
  const deliver = async (r: { uid: string }) => {
    remote.add(campaign().id + r.uid);
    if (attempts++ === 0) throw Error("Response lost after commit");
  };
  const first = await runBroadcast(campaign(), deliver, async () => {});
  assert.equal(first.completed.length, 1);
  assert.ok(first.failures.a);
  const final = await runBroadcast(first, deliver, async () => {});
  assert.equal(remote.size, 2);
  assert.equal(final.completed.length, 2);
  assert.deepEqual(final.failures, {});
  const raw = JSON.stringify(final);
  assert.equal(parseBroadcastDraft(raw, "admin", "email").id, campaign().id);
  assert.throws(() => parseBroadcastDraft(raw, "someone-else", "email"));
  assert.throws(() => parseBroadcastDraft(raw, "admin", "notification"));
  assert.throws(() => parseBroadcastDraft("{}", "admin", "email"));
});
