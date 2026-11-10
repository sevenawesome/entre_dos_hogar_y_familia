import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const {
  hasPermission,
  effectivePermissions,
  normalizePermissions,
  adminPermissions,
} = require("../functions/lib/src/domain/admin-permissions.js");
const {
  defaultEmailSettings,
  migrateEmailBrand,
  validateEmailSettings,
  renderEmailText,
} = require("../functions/lib/src/domain/email-settings.js");
test("owner keeps all permissions; member cannot gain access from supplied flags", () => {
  assert.deepEqual(
    effectivePermissions({ role: "owner", permissions: [] }),
    adminPermissions,
  );
  assert.equal(
    hasPermission(
      { role: "member", permissions: adminPermissions },
      "settings.manage",
    ),
    false,
  );
});
test("explicit empty grants do not become legacy full access and content-only administrators cannot view families", () => {
  assert.deepEqual(
    effectivePermissions({ role: "admin", permissions: [] }),
    [],
  );
  assert.equal(
    hasPermission(
      { role: "admin", permissions: ["content.manage"] },
      "families.view",
    ),
    false,
  );
  assert.equal(
    hasPermission(
      { role: "admin", permissions: ["content.manage"] },
      "content.manage",
    ),
    true,
  );
  assert.deepEqual(effectivePermissions({ role: "admin" }), adminPermissions);
});
test("dependent permissions visibly include family access and reject unknown permissions", () => {
  assert.deepEqual(normalizePermissions(["messages.send"]), [
    "families.view",
    "messages.send",
  ]);
  assert.throws(() => normalizePermissions(["not-a-permission"]));
});
test("mail settings reject oversized quotas, injected headers and unknown template variables", () => {
  for (const change of [
    { dailyLimit: 100 },
    { monthlyLimit: 3000 },
    { replyTo: "test@example.com\nBcc:other@example.com" },
    { fromName: "Name\nBcc" },
    { welcomeTemplate: "{privateAnswers}" },
  ])
    assert.throws(() =>
      validateEmailSettings({ ...defaultEmailSettings, ...change }),
    );
});
test("contact Gmail is configurable as reply-to and text variables never evaluate code", () => {
  assert.equal(
    validateEmailSettings(defaultEmailSettings).replyTo,
    "sevenawesome.srl@gmail.com",
  );
  assert.equal(
    renderEmailText("Hola {person}", { person: "<script>" }),
    "Hola <script>",
  );
});

test("notification and email permissions grant different channels", () => {
  assert.equal(
    hasPermission(
      { role: "admin", permissions: ["messages.send"] },
      "emails.send",
    ),
    false,
  );
  assert.equal(
    hasPermission(
      { role: "admin", permissions: ["emails.send"] },
      "messages.send",
    ),
    false,
  );
  assert.deepEqual(normalizePermissions(["emails.send"]), [
    "families.view",
    "emails.send",
  ]);
});

test("rebranding upgrades old mail labels without resetting configured limits or custom sender names", () => {
  const saved = {
    fromName: "ENTRE DOS",
    welcomeTemplate: "Bienvenidos a ENTRE DOS",
    completionTemplate: "Texto propio para {family}",
    version: 9,
    paused: true,
    dailyLimit: 12,
  };
  const result = migrateEmailBrand(saved);
  assert.equal(result.fromName, "Amor que permanece");
  assert.equal(result.welcomeTemplate, "Bienvenidos a Amor que permanece");
  assert.equal(result.completionTemplate, saved.completionTemplate);
  assert.equal(result.version, 9);
  assert.equal(result.paused, true);
  assert.equal(result.dailyLimit, 12);
  assert.equal(
    migrateEmailBrand({ fromName: "Departamento de Hogar" }).fromName,
    "Departamento de Hogar",
  );
  assert.equal(saved.fromName, "ENTRE DOS");
});

test("public brand text permits hiding the caption but rejects multiline or oversized content", () => {
  const {
    validateBranding,
  } = require("../functions/lib/src/domain/branding.js");
  assert.deepEqual(validateBranding({ version: 3, byline: "   " }), {
    version: 3,
    byline: "",
  });
  assert.equal(
    validateBranding({ version: 3, byline: " Iglesia y familia " }).byline,
    "Iglesia y familia",
  );
  for (const byline of ["a".repeat(121), "a\nb", "a\rb", null])
    assert.throws(() => validateBranding({ version: 3, byline }));
  assert.throws(() => validateBranding({ version: -1, byline: "Firma" }));
});
