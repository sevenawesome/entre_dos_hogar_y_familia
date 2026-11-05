const { spawnSync } = require("node:child_process");
const path = require("node:path");
for (const [script, filename] of [
  ["publish-level.cjs", "level-1.json"],
  ["publish-anniversaries.cjs", "anniversary-catalog.json"],
]) {
  const result = spawnSync(
    process.execPath,
    [
      path.join(__dirname, script),
      path.resolve(__dirname, "../../content", filename),
    ],
    { stdio: "inherit" },
  );
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    break;
  }
}
if (!process.exitCode) {
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, "seed-settings.cjs")],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exitCode = result.status ?? 1;
}
