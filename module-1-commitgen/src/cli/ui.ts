import chalk from "chalk";
import ora, { type Ora } from "ora";
import { CommitGenError } from "../utils/errors.js";

export function createSpinner(text: string): Ora {
  return ora({ text, color: "cyan" });
}

/** Renders a commit message with the header highlighted and body dimmed. */
export function renderCommitMessage(message: string): string {
  const [header = "", ...bodyLines] = message.split("\n");
  const body = bodyLines.join("\n").trim();
  return body.length > 0
    ? `${chalk.bold.cyan(header)}\n\n${chalk.gray(body)}`
    : chalk.bold.cyan(header);
}

export function printCommitMessage(message: string): void {
  console.log();
  console.log(chalk.bold("Suggested commit message:"));
  console.log(renderCommitMessage(message));
  console.log();
}

export function printSuccess(message: string): void {
  console.log(chalk.green(`✔ ${message}`));
}

export function printInfo(message: string): void {
  console.log(chalk.cyan(message));
}

export function printWarning(message: string): void {
  console.log(chalk.yellow(`⚠ ${message}`));
}

export function printError(error: unknown): void {
  if (error instanceof CommitGenError) {
    console.error(chalk.red(`✖ ${error.message}`));
    return;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`✖ Unexpected error: ${message}`));
}
