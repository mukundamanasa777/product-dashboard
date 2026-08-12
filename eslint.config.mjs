import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma's generated client — regenerated fresh on every
    // `prisma generate`, so linting or "fixing" it is pointless (and it's
    // minified/non-idiomatic output, not hand-written source anyway).
    "app/generated/**",
  ]),
]);

export default eslintConfig;
