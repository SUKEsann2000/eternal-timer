import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";

export default defineConfig([
  ...tseslint.configs.recommended.map((config: any) => ({
    ...config,
    files: ["src/**/*.ts", "test/**/*.{mjs,js}", "scripts/**/*.js"],
    languageOptions: {
      ...config.languageOptions,
      globals: globals.node,
    },
    rules: {
      ...config.rules,

      semi: ["error", "always"],

      "comma-dangle": ["error", "always-multiline"],

      indent: ["error", "tab", { SwitchCase: 1 }],
    },
  })),
]);
