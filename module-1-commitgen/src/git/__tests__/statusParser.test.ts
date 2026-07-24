import { describe, expect, it } from "vitest";
import { parseNameStatus } from "../statusParser.js";

describe("parseNameStatus", () => {
  it("parses added, modified, and deleted files", () => {
    const output = "A\tsrc/new-file.ts\nM\tsrc/existing.ts\nD\tsrc/old-file.ts";

    expect(parseNameStatus(output)).toEqual([
      { path: "src/new-file.ts", status: "added" },
      { path: "src/existing.ts", status: "modified" },
      { path: "src/old-file.ts", status: "deleted" },
    ]);
  });

  it("parses renamed files with their previous path", () => {
    const output = "R100\tsrc/old-name.ts\tsrc/new-name.ts";

    expect(parseNameStatus(output)).toEqual([
      { path: "src/new-name.ts", previousPath: "src/old-name.ts", status: "renamed" },
    ]);
  });

  it("parses copied files", () => {
    const output = "C75\tsrc/original.ts\tsrc/copy.ts";

    expect(parseNameStatus(output)).toEqual([
      { path: "src/copy.ts", previousPath: "src/original.ts", status: "copied" },
    ]);
  });

  it("ignores blank lines and trims whitespace", () => {
    const output = "\nA\tsrc/file.ts\n\n";

    expect(parseNameStatus(output)).toEqual([{ path: "src/file.ts", status: "added" }]);
  });

  it("returns an empty array for empty output", () => {
    expect(parseNameStatus("")).toEqual([]);
  });
});
