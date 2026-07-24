/**
 * Base class for all errors CommitGen raises intentionally (as opposed to
 * unexpected bugs). The CLI layer catches this type to print a clean,
 * user-facing message instead of a stack trace.
 */
export class CommitGenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class GitNotInstalledError extends CommitGenError {
  constructor() {
    super("Git does not appear to be installed or is not on your PATH. Install Git and try again.");
  }
}

export class NotAGitRepositoryError extends CommitGenError {
  constructor(cwd: string) {
    super(`"${cwd}" is not inside a Git repository. Run this command from within a Git project.`);
  }
}

export class NoStagedChangesError extends CommitGenError {
  constructor() {
    super(
      'No staged changes were found. Stage files with "git add <file>" before running commitgen.',
    );
  }
}

export class GitCommandError extends CommitGenError {
  constructor(command: string, cause: unknown) {
    super(`Git command failed (${command}): ${extractMessage(cause)}`);
  }
}

function extractMessage(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }
  return String(cause);
}
