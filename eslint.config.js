const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");
module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      "functions/lib/**",
      "functions/node_modules/**",
      "dist/**",
      "content/**",
      "tests/**",
    ],
  },
]);
