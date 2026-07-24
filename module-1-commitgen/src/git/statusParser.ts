import type { StagedFile, StagedFileStatus } from "./types.js";

const STATUS_CODE_MAP: Record<string, StagedFileStatus> = {
  A: "added",
  M: "modified",
  D: "deleted",
  T: "modified",
  U: "modified",
};

/**
 * Parses the output of `git diff --staged --name-status`, e.g.:
 *   A\tsrc/new-file.ts
 *   M\tsrc/existing.ts
 *   R100\told/path.ts\tnew/path.ts
 */
export function parseNameStatus(output: string): StagedFile[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map(parseLine);
}

function parseLine(line: string): StagedFile {
  const [code, ...paths] = line.split("\t");
  const kind = (code ?? "").charAt(0);

  if (kind === "R" || kind === "C") {
    const [previousPath, path] = paths;
    return {
      path: path ?? previousPath ?? "",
      ...(previousPath ? { previousPath } : {}),
      status: kind === "R" ? "renamed" : "copied",
    };
  }

  return {
    path: paths[0] ?? "",
    status: STATUS_CODE_MAP[kind] ?? "modified",
  };
}
