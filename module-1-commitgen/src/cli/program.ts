import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Command } from "commander";
import {
  CommitWorkflow,
  type CommitWorkflowResult,
  type WorkflowReporter,
} from "../commit/commitWorkflow.js";
import { CommitService } from "../commit/commitService.js";
import { SimpleGitClient } from "../git/simpleGitClient.js";
import { InquirerPrompter } from "../prompts/inquirerPrompter.js";
import { createSpinner, printCommitMessage, printError, printSuccess, printWarning } from "./ui.js";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));

export function createProgram(): Command {
  const { version, description } = readPackageMetadata();
  const program = new Command();

  program
    .name("commitgen")
    .description(description)
    .version(version)
    .option("-C, --cwd <path>", "run as if commitgen was started in <path>", process.cwd())
    .action(async (options: { cwd: string }) => {
      await runCommitGen(options.cwd);
    });

  return program;
}

async function runCommitGen(cwd: string): Promise<void> {
  const gitClient = new SimpleGitClient(cwd);
  const commitService = new CommitService(gitClient);
  const prompter = new InquirerPrompter();
  const spinner = createSpinner("Reading staged changes...").start();

  const reporter: WorkflowReporter = {
    showCandidate(message: string) {
      if (spinner.isSpinning) {
        spinner.stop();
      }
      printCommitMessage(message);
    },
  };

  const workflow = new CommitWorkflow(commitService, prompter, reporter);

  try {
    const result = await workflow.run();
    reportOutcome(result);
  } catch (error) {
    spinner.stop();
    printError(error);
    process.exitCode = 1;
  }
}

function reportOutcome(result: CommitWorkflowResult): void {
  if (result.committed) {
    printSuccess("Commit created successfully.");
    return;
  }
  printWarning("Commit cancelled. No changes were made.");
}

function readPackageMetadata(): { version: string; description: string } {
  const packageJsonPath = join(CURRENT_DIR, "../../package.json");
  const raw = readFileSync(packageJsonPath, "utf-8");
  const parsed = JSON.parse(raw) as { version: string; description: string };
  return { version: parsed.version, description: parsed.description };
}
