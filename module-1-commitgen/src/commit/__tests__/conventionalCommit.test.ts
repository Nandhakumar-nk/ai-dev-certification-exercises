import { describe, expect, it } from "vitest";
import { formatCommitMessage, isValidConventionalCommit } from "../conventionalCommit.js";

describe("formatCommitMessage", () => {
  it("formats a header-only message without a scope", () => {
    expect(formatCommitMessage({ type: "docs", subject: "update readme" })).toBe(
      "docs: update readme",
    );
  });

  it("formats a header with a scope", () => {
    expect(formatCommitMessage({ type: "feat", scope: "auth", subject: "add login" })).toBe(
      "feat(auth): add login",
    );
  });

  it("appends the body separated by a blank line", () => {
    expect(
      formatCommitMessage({
        type: "feat",
        scope: "auth",
        subject: "add login",
        body: "- Add src/auth/login.ts",
      }),
    ).toBe("feat(auth): add login\n\n- Add src/auth/login.ts");
  });
});

describe("isValidConventionalCommit", () => {
  it.each([
    "feat: add login",
    "fix(auth): resolve token refresh bug",
    "feat(auth)!: breaking change to session shape",
    "chore: update deps\n\nSome body text",
  ])("accepts '%s'", (message) => {
    expect(isValidConventionalCommit(message)).toBe(true);
  });

  it.each(["", "just a plain message", "feat added login", "feat(auth login"])(
    "rejects '%s'",
    (message) => {
      expect(isValidConventionalCommit(message)).toBe(false);
    },
  );
});
