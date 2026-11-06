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
    { challengeTemplate: "{privateAnswers}" },
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
