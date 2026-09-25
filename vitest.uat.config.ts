import { defineConfig } from "vitest/config";
import UatReporter from "./uat/report.ts";

export default defineConfig({
  test: {
    include: ["uat/**/*.test.ts"],
    environment: "node",
    testTimeout: 15_000,
    reporters: ["default", "junit", new UatReporter("./uat-report/uat-report.html")],
    outputFile: { junit: "./uat-report/junit.xml" },
  },
});
