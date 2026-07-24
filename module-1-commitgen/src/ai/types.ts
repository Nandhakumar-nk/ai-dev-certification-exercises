export const COMMIT_TYPES = [
  "feat",
  "fix",
  "refactor",
  "docs",
  "style",
  "test",
  "build",
  "ci",
  "perf",
  "chore",
] as const;

export type CommitType = (typeof COMMIT_TYPES)[number];

/** Structured facts extracted from a staged diff, before any wording is chosen. */
export interface DiffInsights {
  type: CommitType;
  /** Best-guess scope derived from the changed paths, e.g. "auth". */
  scope?: string;
  addedFiles: string[];
  modifiedFiles: string[];
  deletedFiles: string[];
  renamedFiles: string[];
  /** Total number of files touched, across every status. */
  fileCount: number;
}

/** A fully-worded commit message candidate, ready to be formatted or shown to the user. */
export interface CommitCandidate {
  type: CommitType;
  scope?: string;
  subject: string;
  body?: string;
}
