import { simpleGit, type SimpleGit } from "simple-git";
import { GitCommandError, GitNotInstalledError, NotAGitRepositoryError } from "../utils/errors.js";
import { parseNameStatus } from "./statusParser.js";
import type { GitClient, StagedChanges } from "./types.js";

/** Production `GitClient` backed by the `simple-git` library. */
export class SimpleGitClient implements GitClient {
  private readonly git: SimpleGit;

  constructor(private readonly cwd: string = process.cwd()) {
    this.git = simpleGit({ baseDir: cwd });
  }

  async assertGitIsInstalled(): Promise<void> {
    try {
      await this.git.raw(["--version"]);
    } catch {
      throw new GitNotInstalledError();
    }
  }

  async assertInsideRepository(): Promise<void> {
    let isRepo: boolean;
    try {
      isRepo = await this.git.checkIsRepo();
    } catch (cause) {
      throw new GitCommandError("git rev-parse --is-inside-work-tree", cause);
    }

    if (!isRepo) {
      throw new NotAGitRepositoryError(this.cwd);
    }
  }

  async getStagedChanges(): Promise<StagedChanges> {
    const [diff, nameStatus] = await Promise.all([
      this.runGit(["diff", "--staged"]),
      this.runGit(["diff", "--staged", "--name-status"]),
    ]);

    return {
      diff,
      files: parseNameStatus(nameStatus),
    };
  }

  async commit(message: string): Promise<void> {
    const paragraphs = splitIntoParagraphs(message);
    try {
      await this.git.commit(paragraphs);
    } catch (cause) {
      throw new GitCommandError("git commit", cause);
    }
  }

  private async runGit(args: string[]): Promise<string> {
    try {
      return await this.git.raw(args);
    } catch (cause) {
      throw new GitCommandError(`git ${args.join(" ")}`, cause);
    }
  }
}

/**
 * Splits a commit message on blank lines so each paragraph can be passed as
 * its own `-m` argument. `simple-git` shells out safely (no string
 * interpolation), and Git itself joins multiple `-m` values with a blank
 * line, which is exactly the subject/body separation Conventional Commits
 * expects.
 */
function splitIntoParagraphs(message: string): string[] {
  return message
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}
