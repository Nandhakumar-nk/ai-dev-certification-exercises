export type StagedFileStatus = "added" | "modified" | "deleted" | "renamed" | "copied";

export interface StagedFile {
  /** Current path of the file, relative to the repository root. */
  path: string;
  /** Previous path, present only for renamed/copied files. */
  previousPath?: string;
  status: StagedFileStatus;
}

export interface StagedChanges {
  /** Raw unified diff produced by `git diff --staged`. */
  diff: string;
  files: StagedFile[];
}

/**
 * Minimal surface CommitGen needs from a Git implementation.
 * Keeping this as an interface allows the business logic to depend on an
 * abstraction rather than a concrete `simple-git` instance (dependency
 * inversion), which also makes it trivial to fake in unit tests.
 */
export interface GitClient {
  assertGitIsInstalled(): Promise<void>;
  assertInsideRepository(): Promise<void>;
  getStagedChanges(): Promise<StagedChanges>;
  commit(message: string): Promise<void>;
}
