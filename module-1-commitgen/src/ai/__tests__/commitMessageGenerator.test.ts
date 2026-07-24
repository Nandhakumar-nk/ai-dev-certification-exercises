import { describe, expect, it } from "vitest";
import { CommitMessageGenerator } from "../commitMessageGenerator.js";
import type { DiffInsights } from "../types.js";

function insights(overrides: Partial<DiffInsights>): DiffInsights {
  return {
    type: "feat",
    addedFiles: [],
    modifiedFiles: [],
    deletedFiles: [],
    renamedFiles: [],
    fileCount: 0,
    ...overrides,
  };
}

describe("CommitMessageGenerator", () => {
  const generator = new CommitMessageGenerator();

  it("humanizes the file name as the subject for a single-file change", () => {
    const candidate = generator.generate(
      insights({ type: "feat", addedFiles: ["src/auth/passwordReset.ts"], fileCount: 1 }),
    );
    expect(candidate.subject).toBe("add password reset");
    expect(candidate.body).toBeUndefined();
  });

  it("uses the scope as the subject object when multiple files share one", () => {
    const candidate = generator.generate(
      insights({
        type: "feat",
        scope: "auth",
        addedFiles: ["src/auth/login.ts", "src/auth/session.ts"],
        fileCount: 2,
      }),
    );
    expect(candidate.type).toBe("feat");
    expect(candidate.scope).toBe("auth");
    expect(candidate.subject).toBe("add auth module");
  });

  it("lists changed files in the body when there is more than one", () => {
    const candidate = generator.generate(
      insights({
        type: "feat",
        scope: "auth",
        addedFiles: ["src/auth/login.ts"],
        modifiedFiles: ["src/auth/session.ts"],
        fileCount: 2,
      }),
    );
    expect(candidate.body).toBe("- Add src/auth/login.ts\n- Update src/auth/session.ts");
  });

  it("caps the body at 10 lines and summarizes the rest", () => {
    const addedFiles = Array.from({ length: 12 }, (_, i) => `src/file${i}.ts`);
    const candidate = generator.generate(insights({ type: "feat", addedFiles, fileCount: 12 }));
    const lines = candidate.body?.split("\n") ?? [];
    expect(lines).toHaveLength(11);
    expect(lines.at(-1)).toBe("- ...and 2 more file(s)");
  });

  it("uses 'remove' as the verb when every file was deleted", () => {
    const candidate = generator.generate(
      insights({ type: "chore", deletedFiles: ["src/legacy.ts"], fileCount: 1 }),
    );
    expect(candidate.subject.startsWith("remove")).toBe(true);
  });

  it("uses 'rename' as the verb when every file was renamed", () => {
    const candidate = generator.generate(
      insights({ type: "chore", renamedFiles: ["src/new-name.ts"], fileCount: 1 }),
    );
    expect(candidate.subject.startsWith("rename")).toBe(true);
  });

  it("cycles through alternate verbs on regeneration", () => {
    const base = insights({ type: "fix", modifiedFiles: ["src/auth/login.ts"], fileCount: 1 });
    const first = generator.generate(base, 0);
    const second = generator.generate(base, 1);
    const third = generator.generate(base, 2);

    expect(first.subject).not.toBe(second.subject);
    expect(second.subject).not.toBe(third.subject);
  });

  it("omits the scope property entirely when there is none", () => {
    const candidate = generator.generate(
      insights({ type: "chore", modifiedFiles: ["a.ts", "b.ts"], fileCount: 2 }),
    );
    expect(candidate.scope).toBeUndefined();
    expect(candidate.subject).toBe("update 2 files");
  });
});
