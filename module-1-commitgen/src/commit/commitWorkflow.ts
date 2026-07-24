import type { StagedChanges } from "../git/types.js";
import type { Prompter } from "../prompts/types.js";
import type { CommitService } from "./commitService.js";

/** Output seam the workflow reports through, kept free of any rendering concerns. */
export interface WorkflowReporter {
  showCandidate(message: string): void;
}

export interface CommitWorkflowResult {
  committed: boolean;
  message?: string;
}

/**
 * Drives the accept/edit/regenerate/cancel loop. This is pure business logic:
 * it knows nothing about `chalk`, `ora`, or `commander` — only the
 * `CommitService`, `Prompter`, and `WorkflowReporter` abstractions.
 */
export class CommitWorkflow {
  constructor(
    private readonly commitService: CommitService,
    private readonly prompter: Prompter,
    private readonly reporter: WorkflowReporter,
  ) {}

  async run(): Promise<CommitWorkflowResult> {
    const changes = await this.commitService.loadStagedChanges();

    let variantIndex = 0;
    let message = this.formatCandidate(changes, variantIndex);

    for (;;) {
      this.reporter.showCandidate(message);
      const action = await this.prompter.chooseAction();

      switch (action) {
        case "accept":
          await this.commitService.commit(message);
          return { committed: true, message };

        case "edit":
          message = await this.prompter.editMessage(message);
          break;

        case "regenerate":
          variantIndex += 1;
          message = this.formatCandidate(changes, variantIndex);
          break;

        case "cancel":
          return { committed: false };
      }
    }
  }

  private formatCandidate(changes: StagedChanges, variantIndex: number): string {
    const candidate = this.commitService.generateCandidate(changes, variantIndex);
    return this.commitService.formatMessage(candidate);
  }
}
