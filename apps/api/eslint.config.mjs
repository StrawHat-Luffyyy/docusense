import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    rules: {
      // Allow explicit `any` in catch clauses and middleware signatures
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused vars prefixed with underscore
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      // Require const for variables that are never reassigned
      "prefer-const": "error",
      // No console.log in source code (use pino logger)
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    ignores: [
      "dist/**",
      "src/generated/**",
      "src/__tests__/**",
      "scripts/**",
      "vitest.config.ts",
      "prisma/**",
    ],
  },
);
