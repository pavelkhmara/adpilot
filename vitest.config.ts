import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { 
    environment: "jsdom",
    environmentMatchGlobs: [
      ["tests/**/db.*.test.{ts,tsx}", "node"],
      ["tests/**/api.*.test.{ts,tsx}", "node"],
    ],
    server: {
      deps: { inline: ["@prisma/client"] },
    },
    setupFiles: ["./tests/setup.node.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    globals: true,
    coverage: { 
      provider: 'v8',
      reporter: ["text", "lcov", "html"], 
      reportsDirectory: "./coverage",
      all: false, 
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["**/*.d.ts", "src/**/__mocks__/**"],
      thresholds: {
        lines: 0, statements: 0, functions: 0, branches: 0,
      },
    },
  },
});
