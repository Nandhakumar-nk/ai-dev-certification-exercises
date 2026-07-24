import type { CommitCandidate } from "../ai/types.js";

const CONVENTIONAL_COMMIT_HEADER = /^[a-z]+(\([^)]+\))?!?: .+$/;

/** Renders a candidate into the final `type(scope): subject\n\nbody` text. */
export function formatCommitMessage(candidate: CommitCandidate): string {
  const header = candidate.scope
    ? `${candidate.type}(${candidate.scope}): ${candidate.subject}`
    : `${candidate.type}: ${candidate.subject}`;

  return candidate.body ? `${header}\n\n${candidate.body}` : header;
}

/**
 * Loosely validates that a (possibly hand-edited) message's header follows
 * the Conventional Commits 1.0 shape: `type(scope)?!?: subject`.
 */
export function isValidConventionalCommit(message: string): boolean {
  const header = message.split("\n")[0]?.trim() ?? "";
  return header.length > 0 && CONVENTIONAL_COMMIT_HEADER.test(header);
}
