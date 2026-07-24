import { describe, expect, it } from "vitest";
import { classifyFile, extractScope } from "./fileClassifier.js";

describe("classifyFile", () => {
  it.each([
    ["src/auth/login.test.ts", "test"],
    ["__tests__/login.ts", "test"],
    ["README.md", "docs"],
    ["docs/setup.md", "docs"],
    [".github/workflows/ci.yml", "ci"],
    ["package.json", "build"],
    ["tsconfig.json", "build"],
    ["Dockerfile", "build"],
    ["src/styles/app.css", "style"],
    [".eslintrc.json", "style"],
    ["src/auth/login.ts", "source"],
  ] as const)("classifies %s as %s", (path, expected) => {
    expect(classifyFile(path)).toBe(expected);
  });
});

describe("extractScope", () => {
  it("returns the shared top-level directory under src/", () => {
    expect(extractScope(["src/auth/login.ts", "src/auth/session.ts"])).toBe("auth");
  });

  it("returns undefined when files span multiple directories", () => {
    expect(extractScope(["src/auth/login.ts", "src/billing/invoice.ts"])).toBeUndefined();
  });

  it("returns undefined for root-level files with no directory", () => {
    expect(extractScope(["package.json", "README.md"])).toBeUndefined();
  });

  it("strips common root prefixes before comparing", () => {
    expect(extractScope(["lib/utils/helpers.ts", "src/utils/format.ts"])).toBe("utils");
  });
});
