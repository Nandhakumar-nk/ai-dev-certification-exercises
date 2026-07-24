import { getAllTasks, Priority } from "../db";

const PRIORITY_COLORS: Record<Priority, string> = {
  HIGH: "\x1b[31m", // red
  MEDIUM: "\x1b[33m", // yellow
  LOW: "\x1b[32m", // green
};
const RESET = "\x1b[0m";

function colorPriority(priority: Priority): string {
  return `${PRIORITY_COLORS[priority]}${priority.padEnd(8)}${RESET}`;
}

export function handleList(): void {
  const tasks = getAllTasks();

  if (tasks.length === 0) {
    console.log("No tasks yet. Add one with: taskmaster add \"Your task\"");
    return;
  }

  console.log("\n  ID  Status  Priority  Title");
  console.log("  " + "─".repeat(40));

  for (const task of tasks) {
    const status = task.status === "done" ? "✓ done" : "○ todo";
    console.log(
      `  ${String(task.id).padStart(2)}  ${status.padEnd(6)}  ${colorPriority(task.priority)}  ${task.title}`
    );
  }

  console.log();
}
