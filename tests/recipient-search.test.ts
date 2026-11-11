import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const {
  matchesRecipient,
} = require("../functions/lib/src/domain/recipient-search.js");
const family = {
  uid: "uid-ana-42",
  email: "familia.perez@example.com",
  family: {
    name: "Familia Pérez Rivera",
    partner1: "Ana María",
    partner2: "José Luis",
  },
};
test("recipient search ignores accents, capitalization and surrounding whitespace", () => {
  for (const word of [
    "perez",
    "PÉREZ",
    "  maria  ",
    "JOSE",
    "rivera",
    "uid-ana-42",
  ])
    assert.equal(matchesRecipient(family, word), true, word);
});
test("recipient search matches several words across fields, in any order", () => {
  assert.equal(matchesRecipient(family, "  jose   ANA perez "), true);
  assert.equal(matchesRecipient(family, "example maria"), true);
  assert.equal(matchesRecipient(family, "perez unknown"), false);
});
test("recipient search accepts partial emails and an empty filter, and rejects unrelated families", () => {
  assert.equal(matchesRecipient(family, "perez@examp"), true);
  assert.equal(matchesRecipient(family, ""), true);
  assert.equal(matchesRecipient(family, "   "), true);
  assert.equal(matchesRecipient(family, "martinez"), false);
});
