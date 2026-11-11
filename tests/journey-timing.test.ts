import { createRequire } from "node:module";
import { test } from "node:test";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const {
  remainingChallengeMinutes,
  journeyAvailableAt,
} = require("../functions/lib/src/domain/journey-timing.js");
test("challenge countdown uses the latest completion across levels and rounds remaining minutes up", () => {
  const available = journeyAvailableAt({
    old: { lastCompletionAt: "2026-11-10T16:00:00Z" },
    current: { lastCompletionAt: "2026-11-11T16:00:00Z" },
  });
  assert.equal(available, "2026-11-12T16:00:00.000Z");
  assert.equal(
    remainingChallengeMinutes(available, new Date("2026-11-11T16:00:00Z")),
    1440,
  );
  assert.equal(
    remainingChallengeMinutes(available, new Date("2026-11-12T14:30:00Z")),
    90,
  );
  assert.equal(
    remainingChallengeMinutes(available, new Date("2026-11-12T15:59:59.999Z")),
    1,
  );
  assert.equal(remainingChallengeMinutes(available, new Date(available)), 0);
  assert.equal(
    remainingChallengeMinutes(available, new Date("2026-11-13T16:00:00Z")),
    0,
  );
  assert.equal(remainingChallengeMinutes(null), 0);
  assert.equal(remainingChallengeMinutes("invalid"), 0);
});
