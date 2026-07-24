export type CommitAction = "accept" | "edit" | "regenerate" | "cancel";

/**
 * Abstraction over the interactive menu so business/CLI logic never depends
 * on `@inquirer/prompts` directly — makes it trivial to fake in tests.
 */
export interface Prompter {
  chooseAction(): Promise<CommitAction>;
  editMessage(currentMessage: string): Promise<string>;
}
