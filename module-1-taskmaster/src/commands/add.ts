import { addTask, PRIORITIES, Priority } from "../db";

export function handleAdd(title: string, options: { priority?: string }): void {
  const priority = (options.priority ?? "MEDIUM").toUpperCase();
  if (!PRIORITIES.includes(priority as Priority)) {
    console.error(`Error: Priority must be one of ${PRIORITIES.join(", ")}`);
    process.exit(1);
  }

  const task = addTask(title, priority as Priority);
  console.log(`✓ Added task #${task.id}: "${task.title}" [${task.priority}]`);
}
