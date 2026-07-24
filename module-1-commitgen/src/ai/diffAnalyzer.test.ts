import { describe, expect, it } from "vitest";
import type { StagedChanges, StagedFile, StagedFileStatus } from "../git/types.js";
import { analyzeDiff } from "./diffAnalyzer.js";

function file(path: string, status: StagedFileStatus): StagedFile {
  return { path, status };
}

function changes(files: StagedFile[], diff = ""): StagedChanges {
  return { diff, files };
}

describe("analyzeDiff", () => {
  it("classifies an all-test-file change as type 'test'", () => {
    const result = analyzeDiff(
      changes([file("src/auth/login.test.ts", "added"), file("src/auth/session.test.ts", "added")]),
    );
    expect(result.type).toBe("test");
    expect(result.scope).toBe("auth");
  });

  it("classifies an all-docs change as type 'docs'", () => {
    const result = analyzeDiff(
      changes([file("README.md", "modified"), file("docs/setup.md", "modified")]),
    );
    expect(result.type).toBe("docs");
  });

  it("classifies CI workflow changes as type 'ci'", () => {
    const result = analyzeDiff(changes([file(".github/workflows/ci.yml", "modified")]));
    expect(result.type).toBe("ci");
  });

  it("prefers the 'fix' keyword signal over the added/modified shape heuristic", () => {
    const result = analyzeDiff(
      changes(
        [file("src/auth/login.ts", "modified")],
        "@@ -1,3 +1,3 @@\n-return true\n+// fix null pointer bug\n+return password != null",
      ),
    );
    expect(result.type).toBe("fix");
  });

  it("detects 'refactor' from diff content", () => {
    const result = analyzeDiff(
      changes([file("src/auth/login.ts", "modified")], "refactor login flow for clarity"),
    );
    expect(result.type).toBe("refactor");
  });

  it("detects 'perf' from diff content", () => {
    const result = analyzeDiff(
      changes([file("src/auth/login.ts", "modified")], "optimize the session cache lookup"),
    );
    expect(result.type).toBe("perf");
  });

  it("classifies purely added source files as 'feat' when no keyword matches", () => {
    const result = analyzeDiff(changes([file("src/auth/passwordReset.ts", "added")], "new logic"));
    expect(result.type).toBe("feat");
  });

  it("classifies purely deleted source files as 'chore'", () => {
    const result = analyzeDiff(changes([file("src/auth/legacy.ts", "deleted")], "remove old code"));
    expect(result.type).toBe("chore");
  });

  it("returns no scope when files span multiple directories", () => {
    const result = analyzeDiff(
      changes([file("src/auth/login.ts", "modified"), file("src/billing/invoice.ts", "modified")]),
    );
    expect(result.scope).toBeUndefined();
  });

  it("buckets files by status", () => {
    const result = analyzeDiff(
      changes([
        file("src/a.ts", "added"),
        file("src/b.ts", "modified"),
        file("src/c.ts", "deleted"),
        file("src/d.ts", "renamed"),
      ]),
    );
    expect(result.addedFiles).toEqual(["src/a.ts"]);
    expect(result.modifiedFiles).toEqual(["src/b.ts"]);
    expect(result.deletedFiles).toEqual(["src/c.ts"]);
    expect(result.renamedFiles).toEqual(["src/d.ts"]);
    expect(result.fileCount).toBe(4);
  });
});
