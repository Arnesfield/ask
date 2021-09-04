import { Interface } from 'readline';

/** Callback arguments for Ask. */
export interface AskCallbackArgs {
  /** The current prompt attempt. Starts at `0`. */
  iteration: number;
  /** The previous answer. Contains an empty string for the first iteration. */
  previousAnswer: string;
}

/** Ask options. */
export interface AskOptions {
  /** List of valid answers or a callback that checks if the answer is valid. */
  accept?:
    | boolean
    | string[]
    | ((answer: string) => boolean | Promise<boolean>);
  /** Trims the answer before `format(answer, args)` is called. */
  trim?: boolean;
  /**
   * Format the answer.
   * @param answer The answer.
   * @param args The callback arguments.
   * @returns The formatted answer.
   */
  format?(answer: string, args: AskCallbackArgs): string;
}

/** Ask options with question. */
export interface AskOptionsWithQuestion extends AskOptions {
  /** The question. */
  question: string;
}

/**
 * Ask callback options.
 * @param args The callback arguments.
 * @returns The options with question.
 */
export type AskCallbackOptions = (
  args: AskCallbackArgs
) => AskOptionsWithQuestion;

/** Ask function. */
export interface AskFunction {
  /**
   * Ask for user input.
   * @param question The question.
   * @param options Additional options.
   * @returns The answer.
   */
  (question: string, options?: AskOptions): Promise<string>;
  /**
   * Ask for user input.
   * @param callback The callback options.
   * @returns The answer.
   */
  (callback: AskCallbackOptions): Promise<string>;
}

/** Ask properties. */
export interface AskProps {
  /** The `readline.Interface`. */
  rl: Interface;
  [key: string]: any;
}

/** Ask function with additional methods. */
export interface Ask<T extends AskProps = { rl: Interface }>
  extends AskFunction {
  /**
   * Create a scoped call.
   * The `readline.Interface` will close only after the `callback` is finished.
   * @param callback The scoped callback function with the `ask` function.
   * @returns The result of `callback`.
   */
  scoped<R>(callback: (ask: AskFunction, props: T) => R): R;
}
