import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) });

export default [
  { ignores: [".claude/**", "next-env.d.ts", ".next/**", "node_modules/**", "public/**", "scripts/**", "design/**", "ladle-build/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // All logging goes through lib/log.ts, which never prints card data.
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  {
    // Story fakes keep the real functions' signatures, so unused params are expected.
    files: [".ladle/mocks/**"],
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  },
];
