import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": new URL("./apps/mobile/src", import.meta.url).pathname,
      "@fielddoc/config": new URL(
        "./packages/config/src/index.ts",
        import.meta.url,
      ).pathname,
      "@fielddoc/domain": new URL(
        "./packages/domain/src/index.ts",
        import.meta.url,
      ).pathname,
      "@fielddoc/validation": new URL(
        "./packages/validation/src/index.ts",
        import.meta.url,
      ).pathname,
    },
  },
  test: {
    include: [
      "packages/**/*.test.ts",
      "apps/mobile/src/**/*.test.ts",
      "apps/web/app/**/*.test.ts",
    ],
    passWithNoTests: false,
  },
});
