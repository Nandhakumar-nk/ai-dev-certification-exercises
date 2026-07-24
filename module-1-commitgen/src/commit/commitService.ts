import { CommitMessageGenerator } from "../ai/commitMessageGenerator.js";
import { analyzeDiff } from "../ai/diffAnalyzer.js";
import type { CommitCandidate } from "../ai/types.js";
import type { GitClient, StagedChanges } from "../git/types.js";
import { NoStagedChangesError } from "../utils/errors.js";
import { formatCommitMessage } from "./conventionalCommit.js";

/**
 * Coordinates the Git and AI-analysis layers behind a small API the CLI can
 * drive. Depends on the `GitClient` interface rather than a concrete
 * implementation, so it can be unit tested with a fake.
 */
export class CommitService {
  constructor(
    private readonly git: GitClient,
    private readonly generator: CommitMessageGenerator = new CommitMessageGenerator(),
  ) {}

  /** Validates the environment and returns the currently staged changes. */
  async loadStagedChanges(): Promise<StagedChanges> {
    await this.git.assertGitIsInstalled();
    await this.git.assertInsideRepository();

    const changes = await this.git.getStagedChanges();
    if (changes.files.length === 0) {
      throw new NoStagedChangesError();
    }

    return changes;
  }

  /** Produces the Nth worded candidate for the given staged changes (N cycles on regenerate). */
  generateCandidate(changes: StagedChanges, variantIndex = 0): CommitCandidate {
    const insights = analyzeDiff(changes);
    return this.generator.generate(insights, variantIndex);
  }

  formatMessage(candidate: CommitCandidate): string {
    return formatCommitMessage(candidate);
  }

  async commit(message: string): Promise<void> {
    await this.git.commit(message);
  }
}
