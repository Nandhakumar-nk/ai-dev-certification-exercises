import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("db", () => {
  let tmpDir: string;
  let originalCwd: string;
  let dbModule: typeof import("./db");

  beforeEach(async () => {
    originalCwd = process.cwd();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "taskmaster-test-"));
    process.chdir(tmpDir);
    vi.resetModules();
    dbModule = await import("./db");
  });

  afterEach(() => {
    try {
      dbModule.getDb().close();
    } catch {
      // ignore if already closed
    }
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("adds a task and retrieves it with defaults", () => {
    const task = dbModule.addTask("Write CI workflow");
    expect(task.title).toBe("Write CI workflow");
    expect(task.priority).toBe("MEDIUM");
    expect(task.status).toBe("todo");

    const all = dbModule.getAllTasks();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe("Write CI workflow");
  });

  it("marks a task done and deletes a task", () => {
    const task = dbModule.addTask("Temp task", "HIGH");

    expect(dbModule.markDone(task.id)).toBe(true);
    let all = dbModule.getAllTasks();
    expect(all[0].status).toBe("done");

    expect(dbModule.deleteTask(task.id)).toBe(true);
    all = dbModule.getAllTasks();
    expect(all).toHaveLength(0);
  });

  it("returns false when marking/deleting a non-existent task", () => {
    expect(dbModule.markDone(9999)).toBe(false);
    expect(dbModule.deleteTask(9999)).toBe(false);
  });
});
