import { Command } from "commander";
import { handleAdd } from "./commands/add";
import { handleList } from "./commands/list";
import { handleDone } from "./commands/done";
import { handleDelete } from "./commands/delete";

const program = new Command();

program
  .name("taskmaster")
  .description("A simple CLI task manager")
  .version("1.0.0");

program
  .command("add")
  .description("Add a new task")
  .argument("<title>", "Task title")
  .option("-p, --priority <priority>", "Priority: LOW, MEDIUM, or HIGH", "MEDIUM")
  .action(handleAdd);

program
  .command("list")
  .description("List all tasks")
  .action(handleList);

program
  .command("done")
  .description("Mark a task as done")
  .argument("<id>", "Task ID")
  .action(handleDone);

program
  .command("delete")
  .description("Delete a task")
  .argument("<id>", "Task ID")
  .action(handleDelete);

program.parse();
