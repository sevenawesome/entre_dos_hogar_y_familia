import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const {
  eventEmailDraft,
} = require("../functions/lib/src/domain/email-reminders.js");
const {
  defaultEmailSettings,
} = require("../functions/lib/src/domain/email-settings.js");
test("welcome and achieved level use only explicit transactional categories", () => {
  const welcome = eventEmailDraft("welcome", "Familia Sol", "");
  assert.deepEqual(welcome.categories, ["welcome"]);
  assert.match(welcome.lines[0], /Familia Sol/);
  const done = eventEmailDraft(
    "levelCompleted",
    "Familia Sol",
    "Nuestro comienzo",
  );
  assert.deepEqual(done.categories, ["levelCompleted"]);
  assert.match(done.lines[0], /Nuestro comienzo/);
});
test("disabled categories and unknown events never generate daily or celebration mail", () => {
  assert.equal(
    eventEmailDraft("welcome", "Sol", "", {
      ...defaultEmailSettings,
      welcomeEnabled: false,
    }),
    null,
  );
  assert.equal(
    eventEmailDraft("levelCompleted", "Sol", "Nivel", {
      ...defaultEmailSettings,
      completionEnabled: false,
    }),
    null,
  );
  assert.equal(eventEmailDraft("levelCompleted", "Sol", ""), null);
  for (const kind of ["birthday", "anniversary", "challenges", "daily"])
    assert.equal(eventEmailDraft(kind, "Sol", "Nivel"), null);
});
test("custom event templates substitute text without evaluating HTML or code", () => {
  const draft = eventEmailDraft("levelCompleted", "<familia>", "Uno", {
    ...defaultEmailSettings,
    completionTemplate: "{family} consigui� {levelTitle}",
  });
  assert.equal(draft.lines[0], "<familia> consigui� Uno");
});
