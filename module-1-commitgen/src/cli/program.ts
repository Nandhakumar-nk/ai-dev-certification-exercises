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
import {
  createSpinner,
  printCommitMessage,
  printError,
  printInfo,
  printSuccess,
  printWarning,
} from "./ui.js";

const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));

export function createProgram(): Command {
  const { version, description } = readPackageMetadata();
  const program = new Command();

  program
    .name("commitgen")
    .description(description)
    .version(version)
    .option("-C, --cwd <path>", "run as if commitgen was started in <path>", process.cwd())
    .option("--dry-run", "show the generated commit message without creating a commit")
    .action(async (options: { cwd: string; dryRun: boolean }) => {
      await runCommitGen(options.cwd, options.dryRun);
    });

  return program;
}

async function runCommitGen(cwd: string, dryRun: boolean): Promise<void> {
  const gitClient = new SimpleGitClient(cwd);
  const commitService = new CommitService(gitClient);
  const spinner = createSpinner("Reading staged changes...").start();

  try {
    if (dryRun) {
      const changes = await commitService.loadStagedChanges();
      const candidate = commitService.generateCandidate(changes);
      const message = commitService.formatMessage(candidate);
      spinner.stop();
      printCommitMessage(message);
      printInfo("Dry run: no commit was created.");
      return;
    }

    const prompter = new InquirerPrompter();
    const reporter: WorkflowReporter = {
      showCandidate(message: string) {
        if (spinner.isSpinning) {
          spinner.stop();
        }
        printCommitMessage(message);
      },
    };

    const workflow = new CommitWorkflow(commitService, prompter, reporter);
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
