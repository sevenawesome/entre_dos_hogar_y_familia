import { test } from "node:test";
import assert from "node:assert/strict";
import { tryBrandedAuthEmail, AuthEmailLimitError } from "../src/services/branded-auth-email.ts";
test("custom auth mail propagates deliberate rate limits and retains free fallback for outages or full quota", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json({ error: "Espera un minuto." }, { status: 429 });
    await assert.rejects(tryBrandedAuthEmail("recovery", "test@example.com"), error => error instanceof AuthEmailLimitError && error.message === "Espera un minuto.");
    globalThis.fetch = async () => Response.json({ provider: "firebase" });
    assert.equal(await tryBrandedAuthEmail("recovery", "test@example.com"), false);
    globalThis.fetch = async () => { throw Error("offline"); };
    assert.equal(await tryBrandedAuthEmail("recovery", "test@example.com"), false);
    globalThis.fetch = async () => Response.json({ provider: "resend" });
    assert.equal(await tryBrandedAuthEmail("recovery", "test@example.com"), true);
  } finally { globalThis.fetch = original; }
});
