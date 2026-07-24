import type { StagedChanges } from "../git/types.js";
import { classifyFile, extractScope, type FileCategory } from "./fileClassifier.js";
import type { CommitType, DiffInsights } from "./types.js";

interface KeywordSignal {
  type: CommitType;
  pattern: RegExp;
}

// Order matters: the first matching signal wins.
const KEYWORD_SIGNALS: KeywordSignal[] = [
  { type: "fix", pattern: /\b(fix(e[sd])?|bug|crash|error|fail(s|ed|ure)?|issue)\b/i },
  { type: "perf", pattern: /\b(perf(ormance)?|optimi[sz]e[sd]?|speed up|cache[sd]?)\b/i },
  {
    type: "refactor",
    pattern: /\b(refactor(ed|ing)?|rename[sd]?|clean\s?up|extract(ed)?|simplify)\b/i,
  },
];

const CATEGORY_TO_TYPE: Partial<Record<FileCategory, CommitType>> = {
  test: "test",
  docs: "docs",
  ci: "ci",
  build: "build",
  style: "style",
};

/**
 * Analyzes a set of staged changes and derives the structured facts (type,
 * scope, file breakdown) a commit message will be built from. Contains no
 * wording decisions — see `commitMessageGenerator.ts` for that.
 */
export function analyzeDiff(changes: StagedChanges): DiffInsights {
  const addedFiles = changes.files.filter((f) => f.status === "added").map((f) => f.path);
  const modifiedFiles = changes.files.filter((f) => f.status === "modified").map((f) => f.path);
  const deletedFiles = changes.files.filter((f) => f.status === "deleted").map((f) => f.path);
  const renamedFiles = changes.files.filter((f) => f.status === "renamed").map((f) => f.path);

  const allPaths = changes.files.map((f) => f.path);
  const scope = extractScope(allPaths);
  const type = inferCommitType(changes, allPaths);

  return {
    type,
    ...(scope ? { scope } : {}),
    addedFiles,
    modifiedFiles,
    deletedFiles,
    renamedFiles,
    fileCount: changes.files.length,
  };
}

function inferCommitType(changes: StagedChanges, paths: string[]): CommitType {
  const categories = paths.map(classifyFile);
  const dominantCategory = categories.every((c) => c === categories[0]) ? categories[0] : undefined;

  if (dominantCategory && dominantCategory !== "source") {
    return CATEGORY_TO_TYPE[dominantCategory] ?? "chore";
  }

  const keywordMatch = KEYWORD_SIGNALS.find((signal) => signal.pattern.test(changes.diff));
  if (keywordMatch) {
    return keywordMatch.type;
  }

  return inferTypeFromChangeShape(changes);
}

function inferTypeFromChangeShape(changes: StagedChanges): CommitType {
  const added = changes.files.filter((f) => f.status === "added").length;
  const modified = changes.files.filter((f) => f.status === "modified").length;
  const deleted = changes.files.filter((f) => f.status === "deleted").length;

  if (added > 0 && modified === 0 && deleted === 0) {
    return "feat";
  }
  if (deleted > 0 && added === 0 && modified === 0) {
    return "chore";
  }
  if (added >= modified) {
    return "feat";
  }
  return "chore";
}
