import { describe, expect, it, vi } from "vitest";
import type { GitClient, StagedChanges } from "../../git/types.js";
import { NoStagedChangesError } from "../../utils/errors.js";
import { CommitService } from "../commitService.js";

function fakeGitClient(overrides: Partial<GitClient> = {}): GitClient {
  return {
    assertGitIsInstalled: vi.fn().mockResolvedValue(undefined),
    assertInsideRepository: vi.fn().mockResolvedValue(undefined),
    getStagedChanges: vi.fn().mockResolvedValue({ diff: "", files: [] } satisfies StagedChanges),
    commit: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("CommitService", () => {
  it("throws NoStagedChangesError when there are no staged files", async () => {
    const git = fakeGitClient();
    const service = new CommitService(git);

    await expect(service.loadStagedChanges()).rejects.toBeInstanceOf(NoStagedChangesError);
  });

  it("returns staged changes when files are present", async () => {
    const changes: StagedChanges = {
      diff: "diff text",
      files: [{ path: "a.ts", status: "added" }],
    };
    const git = fakeGitClient({ getStagedChanges: vi.fn().mockResolvedValue(changes) });
    const service = new CommitService(git);

    await expect(service.loadStagedChanges()).resolves.toEqual(changes);
  });

  it("validates git is installed and the cwd is a repository before reading changes", async () => {
    const git = fakeGitClient();
    const service = new CommitService(git);

    await service.loadStagedChanges().catch(() => undefined);

    expect(git.assertGitIsInstalled).toHaveBeenCalledOnce();
    expect(git.assertInsideRepository).toHaveBeenCalledOnce();
  });

  it("generates a candidate from staged changes via the diff analyzer", () => {
    const service = new CommitService(fakeGitClient());
    const changes: StagedChanges = {
      diff: "",
      files: [{ path: "src/auth/login.ts", status: "added" }],
    };

    const candidate = service.generateCandidate(changes);
    expect(candidate.type).toBe("feat");
  });

  it("delegates commit to the git client with the final message", async () => {
    const git = fakeGitClient();
    const service = new CommitService(git);

    await service.commit("feat: add login");

    expect(git.commit).toHaveBeenCalledWith("feat: add login");
  });
});
