import { humanizeFileName, truncate } from "../utils/text.js";
import type { CommitCandidate, CommitType, DiffInsights } from "./types.js";

const MAX_SUBJECT_LENGTH = 60;
const MAX_BODY_LINES = 10;

/** Alternate verb phrasings per type, cycled through on "regenerate". */
const VERBS_BY_TYPE: Record<CommitType, string[]> = {
  feat: ["add", "introduce", "implement"],
  fix: ["fix", "resolve", "correct"],
  refactor: ["refactor", "restructure", "simplify"],
  docs: ["update", "revise", "improve"],
  style: ["format", "restyle", "tidy up"],
  test: ["add", "update", "extend"],
  build: ["update", "bump", "adjust"],
  ci: ["update", "adjust", "tweak"],
  perf: ["improve", "optimize", "speed up"],
  chore: ["update", "adjust", "tidy up"],
};

/**
 * Turns the structured facts from `diffAnalyzer` into worded commit message
 * candidates. Kept separate from `diffAnalyzer` so wording can change (or be
 * regenerated) without re-deriving type/scope from the diff each time.
 */
export class CommitMessageGenerator {
  generate(insights: DiffInsights, variantIndex = 0): CommitCandidate {
    const subject = this.buildSubject(insights, variantIndex);
    const body = this.buildBody(insights);

    return {
      type: insights.type,
      ...(insights.scope ? { scope: insights.scope } : {}),
      subject,
      ...(body ? { body } : {}),
    };
  }

  private buildSubject(insights: DiffInsights, variantIndex: number): string {
    const verb = this.pickVerb(insights, variantIndex);
    const object = this.buildObject(insights, variantIndex);
    return truncate(`${verb} ${object}`, MAX_SUBJECT_LENGTH);
  }

  private pickVerb(insights: DiffInsights, variantIndex: number): string {
    if (variantIndex === 0) {
      const shapeVerb = this.pickShapeVerb(insights);
      if (shapeVerb) {
        return shapeVerb;
      }
    }

    const verbs = VERBS_BY_TYPE[insights.type];
    return verbs[variantIndex % verbs.length] ?? verbs[0] ?? "update";
  }

  /** Overrides the type-based verb when every file was purely deleted or renamed. */
  private pickShapeVerb(insights: DiffInsights): string | undefined {
    const { addedFiles, modifiedFiles, deletedFiles, renamedFiles } = insights;

    if (deletedFiles.length > 0 && addedFiles.length === 0 && modifiedFiles.length === 0) {
      return "remove";
    }
    if (
      renamedFiles.length > 0 &&
      addedFiles.length === 0 &&
      modifiedFiles.length === 0 &&
      deletedFiles.length === 0
    ) {
      return "rename";
    }
    return undefined;
  }

  private buildObject(insights: DiffInsights, variantIndex: number): string {
    const allFiles = [
      ...insights.addedFiles,
      ...insights.modifiedFiles,
      ...insights.deletedFiles,
      ...insights.renamedFiles,
    ];

    if (insights.fileCount === 1 && allFiles[0]) {
      return humanizeFileName(allFiles[0]);
    }
    if (insights.scope) {
      return variantIndex % 2 === 0 ? `${insights.scope} module` : insights.scope;
    }
    return `${insights.fileCount} files`;
  }

  private buildBody(insights: DiffInsights): string | undefined {
    if (insights.fileCount <= 1) {
      return undefined;
    }

    const lines = [
      ...insights.addedFiles.map((path) => `- Add ${path}`),
      ...insights.modifiedFiles.map((path) => `- Update ${path}`),
      ...insights.deletedFiles.map((path) => `- Remove ${path}`),
      ...insights.renamedFiles.map((path) => `- Rename ${path}`),
    ];

    if (lines.length <= MAX_BODY_LINES) {
      return lines.join("\n");
    }

    const shown = lines.slice(0, MAX_BODY_LINES);
    shown.push(`- ...and ${lines.length - MAX_BODY_LINES} more file(s)`);
    return shown.join("\n");
  }
}
