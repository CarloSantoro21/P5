import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      // The pool's bundled workerd lags behind wrangler.jsonc's compatibility_date.
      miniflare: { compatibilityDate: "2026-08-22" },
    }),
  ],
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "istanbul",
      include: ["src/**/*.ts"],
      reporter: ["text", "html", "lcov", "json-summary"],
      reportsDirectory: "./coverage",
    },
  },
});
