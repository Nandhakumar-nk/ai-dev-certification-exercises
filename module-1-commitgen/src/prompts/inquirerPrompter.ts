import { editor, select } from "@inquirer/prompts";
import type { CommitAction, Prompter } from "./types.js";

/** Production `Prompter` backed by `@inquirer/prompts`. */
export class InquirerPrompter implements Prompter {
  async chooseAction(): Promise<CommitAction> {
    return select<CommitAction>({
      message: "What would you like to do with this commit message?",
      choices: [
        { name: "Accept", value: "accept", description: "Commit with this message" },
        { name: "Edit manually", value: "edit", description: "Open your editor to tweak it" },
        { name: "Regenerate", value: "regenerate", description: "Try a different phrasing" },
        { name: "Cancel", value: "cancel", description: "Abort without committing" },
      ],
    });
  }

  async editMessage(currentMessage: string): Promise<string> {
    return editor({
      message: "Edit the commit message, then save and close the editor.",
      default: currentMessage,
      postfix: ".txt",
    });
  }
}
