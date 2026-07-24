import { describe, expect, it, vi } from "vitest";
import type { GitClient, StagedChanges } from "../../git/types.js";
import type { CommitAction, Prompter } from "../../prompts/types.js";
import { CommitService } from "../commitService.js";
import { CommitWorkflow, type WorkflowReporter } from "../commitWorkflow.js";

const STAGED_CHANGES: StagedChanges = {
  diff: "",
  files: [{ path: "src/auth/login.ts", status: "added" }],
};

function fakeGitClient(): GitClient {
  return {
    assertGitIsInstalled: vi.fn().mockResolvedValue(undefined),
    assertInsideRepository: vi.fn().mockResolvedValue(undefined),
    getStagedChanges: vi.fn().mockResolvedValue(STAGED_CHANGES),
    commit: vi.fn().mockResolvedValue(undefined),
  };
}

function fakePrompter(actions: CommitAction[], editedMessage?: string): Prompter {
  const chooseAction = vi.fn();
  for (const action of actions) {
    chooseAction.mockResolvedValueOnce(action);
  }
  return {
    chooseAction,
    editMessage: vi.fn().mockResolvedValue(editedMessage ?? ""),
  };
}

function fakeReporter(): WorkflowReporter & { messages: string[] } {
  const messages: string[] = [];
  return {
    messages,
    showCandidate: vi.fn((message: string) => messages.push(message)),
  };
}

describe("CommitWorkflow", () => {
  it("commits the generated message when the user accepts", async () => {
    const git = fakeGitClient();
    const workflow = new CommitWorkflow(
      new CommitService(git),
      fakePrompter(["accept"]),
      fakeReporter(),
    );

    const result = await workflow.run();

    expect(result.committed).toBe(true);
    expect(git.commit).toHaveBeenCalledWith(result.message);
  });

  it("commits the edited message when the user edits then accepts", async () => {
    const git = fakeGitClient();
    const prompter = fakePrompter(["edit", "accept"], "feat: hand-edited message");
    const workflow = new CommitWorkflow(new CommitService(git), prompter, fakeReporter());

    const result = await workflow.run();

    expect(result.committed).toBe(true);
    expect(result.message).toBe("feat: hand-edited message");
    expect(git.commit).toHaveBeenCalledWith("feat: hand-edited message");
  });

  it("shows a different candidate after regenerating", async () => {
    const git = fakeGitClient();
    const reporter = fakeReporter();
    const workflow = new CommitWorkflow(
      new CommitService(git),
      fakePrompter(["regenerate", "accept"]),
      reporter,
    );

    await workflow.run();

    expect(reporter.messages).toHaveLength(2);
    expect(reporter.messages[0]).not.toBe(reporter.messages[1]);
  });

  it("does not commit and reports cancellation when the user cancels", async () => {
    const git = fakeGitClient();
    const workflow = new CommitWorkflow(
      new CommitService(git),
      fakePrompter(["cancel"]),
      fakeReporter(),
    );

    const result = await workflow.run();

    expect(result.committed).toBe(false);
    expect(result.message).toBeUndefined();
    expect(git.commit).not.toHaveBeenCalled();
  });
});
