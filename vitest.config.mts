import path from "path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@excalimove\/common$/,
        replacement: path.resolve(__dirname, "./packages/common/src/index.ts"),
      },
      {
        find: /^@excalimove\/common\/(.*?)/,
        replacement: path.resolve(__dirname, "./packages/common/src/$1"),
      },
      {
        find: /^@excalimove\/element$/,
        replacement: path.resolve(__dirname, "./packages/element/src/index.ts"),
      },
      {
        find: /^@excalimove\/element\/(.*?)/,
        replacement: path.resolve(__dirname, "./packages/element/src/$1"),
      },
      {
        find: /^@excalimove\/excalimove$/,
        replacement: path.resolve(__dirname, "./packages/excalimove/index.tsx"),
      },
      {
        find: /^@excalimove\/excalimove\/(.*?)/,
        replacement: path.resolve(__dirname, "./packages/excalimove/$1"),
      },
      {
        find: /^@excalimove\/math$/,
        replacement: path.resolve(__dirname, "./packages/math/src/index.ts"),
      },
      {
        find: /^@excalimove\/math\/(.*?)/,
        replacement: path.resolve(__dirname, "./packages/math/src/$1"),
      },
      {
        find: /^@excalimove\/utils$/,
        replacement: path.resolve(__dirname, "./packages/utils/src/index.ts"),
      },
      {
        find: /^@excalimove\/utils\/(.*?)/,
        replacement: path.resolve(__dirname, "./packages/utils/src/$1"),
      },
      {
        find: /^@excalimove\/fractional-indexing$/,
        replacement: path.resolve(
          __dirname,
          "./packages/fractional-indexing/src/index.ts",
        ),
      },
      {
        find: /^@excalimove\/fractional-indexing\/(.*?)/,
        replacement: path.resolve(
          __dirname,
          "./packages/fractional-indexing/src/$1",
        ),
      },
      {
        find: /^@excalimove\/laser-pointer$/,
        replacement: path.resolve(
          __dirname,
          "./packages/laser-pointer/src/index.ts",
        ),
      },
      {
        find: /^@excalimove\/laser-pointer\/(.*?)/,
        replacement: path.resolve(__dirname, "./packages/laser-pointer/src/$1"),
      },
    ],
  },
  //@ts-ignore
  test: {
    // Since hooks are running in stack in v2, which means all hooks run serially whereas
    // we need to run them in parallel
    sequence: {
      hooks: "parallel",
    },
    setupFiles: ["./setupTests.ts"],
    globals: true,
    environment: "jsdom",
    // don't list skipped tests in the failure tree — keeps output readable
    hideSkippedTests: true,
    coverage: {
      reporter: ["text", "json-summary", "json", "html", "lcovonly"],
      // Since v2, it ignores empty lines by default and we need to disable it as it affects the coverage
      // Additionally the thresholds also needs to be updated slightly as a result of this change
      ignoreEmptyLines: false,
      thresholds: {
        lines: 60,
        branches: 70,
        functions: 63,
        statements: 60,
      },
    },
  },
});
