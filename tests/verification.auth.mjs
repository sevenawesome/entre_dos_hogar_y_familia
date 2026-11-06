import { test } from "node:test";
import assert from "node:assert/strict";
import { initializeApp, deleteApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  applyActionCode,
  reload,
  getIdTokenResult,
  confirmPasswordReset,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import {
  sendRecoveryLink,
  changePasswordForUser,
} from "../src/services/password-auth.ts";

function localAuth(name) {
  const app = initializeApp(
    {
      projectId: "demo-entre-dos",
      apiKey: "fake-api-key",
      authDomain: "localhost",
    },
    name,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  return { app, auth };
}
test("Firebase sends and validates a verification link locally without sending real mail", async () => {
  const app = initializeApp(
    {
      projectId: "demo-entre-dos",
      apiKey: "fake-api-key",
      authDomain: "localhost",
    },
    "verification-check",
  );
  try {
    const auth = getAuth(app);
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    auth.languageCode = "es";
    const email = `verification-${Date.now()}@example.com`;
    const { user } = await createUserWithEmailAndPassword(
      auth,
      email,
      "Only-for-local-tests-123!",
    );
    assert.equal(user.emailVerified, false);
    await sendEmailVerification(user);
    const response = await fetch(
        "http://127.0.0.1:9099/emulator/v1/projects/demo-entre-dos/oobCodes",
      ),
      data = await response.json();
    const code = data.oobCodes?.find(
      (c) => c.email === email && c.requestType === "VERIFY_EMAIL",
    );
    assert.ok(code, "El emulador debe contener el correo de verificación");
    await applyActionCode(auth, code.oobCode);
    await reload(user);
    assert.equal(user.emailVerified, true);
    assert.equal(
      (await getIdTokenResult(user, true)).claims.email_verified,
      true,
    );
  } finally {
    await deleteApp(app);
  }
});

test("forgotten password issues a usable recovery link without changing the family identity", async () => {
  const { app, auth } = localAuth("recovery-check");
  try {
    const email = `recovery-${Date.now()}@example.com`,
      old = "Old-local-password-123!",
      next = "New-local-password-456!";
    const { user } = await createUserWithEmailAndPassword(auth, email, old),
      uid = user.uid;
    await signOut(auth);
    await assert.rejects(sendRecoveryLink(auth, ""), /correo/);
    await sendRecoveryLink(auth, `  ${email}  `);
    const codes = await (
      await fetch(
        "http://127.0.0.1:9099/emulator/v1/projects/demo-entre-dos/oobCodes",
      )
    ).json();
    const code = codes.oobCodes.find(
      (c) => c.email === email && c.requestType === "PASSWORD_RESET",
    );
    assert.ok(code, "El correo de recuperación debe contener un código válido");
    await confirmPasswordReset(auth, code.oobCode, next);
    await assert.rejects(signInWithEmailAndPassword(auth, email, old));
    assert.equal(
      (await signInWithEmailAndPassword(auth, email, next)).user.uid,
      uid,
    );
    await assert.rejects(
      confirmPasswordReset(auth, code.oobCode, next),
      /invalid-action-code|expired-action-code/,
    );
    await sendRecoveryLink(auth, `unknown-${Date.now()}@example.com`);
  } finally {
    await deleteApp(app);
  }
});

test("in-app password change verifies the current password, validates confirmation and preserves the UID", async () => {
  const { app, auth } = localAuth("password-change-check");
  try {
    const email = `password-${Date.now()}@example.com`,
      old = "Only-local-old-123!",
      next = "Only-local-new-456!";
    const { user } = await createUserWithEmailAndPassword(auth, email, old),
      uid = user.uid;
    const active = () => auth.currentUser?.uid === uid;
    await assert.rejects(
      changePasswordForUser(user, "", next, next, active),
      /actual/,
    );
    await assert.rejects(
      changePasswordForUser(user, old, "short", "short", active),
      /8 y 128/,
    );
    await assert.rejects(
      changePasswordForUser(user, old, next, "different", active),
      /confirmación/,
    );
    await assert.rejects(
      changePasswordForUser(user, old, old, old, active),
      /distinta/,
    );
    await assert.rejects(
      changePasswordForUser(user, "Wrong-local-password!", next, next, active),
    );
    let calls = 0;
    await assert.rejects(
      changePasswordForUser(user, old, next, next, () => ++calls === 1),
      /sesión cambió/,
    );
    await changePasswordForUser(user, old, next, next, active);
    await signOut(auth);
    await assert.rejects(signInWithEmailAndPassword(auth, email, old));
    assert.equal(
      (await signInWithEmailAndPassword(auth, email, next)).user.uid,
      uid,
    );
  } finally {
    await deleteApp(app);
  }
});
