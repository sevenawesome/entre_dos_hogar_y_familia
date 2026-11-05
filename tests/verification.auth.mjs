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
} from "firebase/auth";
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
