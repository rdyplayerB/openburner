import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  { ignores: [".claude/**", "next-env.d.ts", ".next/**", "node_modules/**", "public/**", "scripts/**", "design/**", "ladle-build/**"] },
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      // All logging goes through lib/log.ts, which never prints card data.
      "no-console": "error",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      // New in eslint-config-next 16. These flag long-standing patterns, so they
      // warn until each one is reviewed rather than failing lint.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  {
    // Story fakes keep the real functions' signatures, so unused params are expected.
    files: [".ladle/mocks/**"],
    rules: { "@typescript-eslint/no-unused-vars": "off" },
  },
];
