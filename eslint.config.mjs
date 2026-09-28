import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  { settings: { next: { rootDir: "apps/web/" }, react: { version: "19.2" } } },
  {
    rules: {
      // Plain anchors avoid Next.js Link hydration cost (Lighthouse TBT).
      "@next/next/no-html-link-for-pages": "off"
    }
  },
  globalIgnores([
    "**/.next/**",
    "**/next-env.d.ts",
    "**/*.tsbuildinfo",
    "**/node_modules/**",
    "apps/web/public/**",
    "test-results/**",
    "playwright-report/**",
    "coverage/**"
  ]),
]);
