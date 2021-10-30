import { Interface } from 'readline';

/** Callback context for Ask. */
export interface AskCallbackContext {
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
  /** Trims the answer before `format(answer, context)` is called. */
  trim?: boolean;
  /**
   * Format the answer.
   * @param answer The answer.
   * @param context The callback context.
   * @returns The formatted answer.
   */
  format?(answer: string, context: AskCallbackContext): string;
}

/** Ask options with question. */
export interface AskOptionsWithQuestion extends AskOptions {
  /** The question. */
  question: string;
}

/** Ask callback. */
export interface AskCallback<T extends AskProps = { rl: Interface }> {
  /**
   * Ask callback.
   * @param context The callback context.
   * @param props The Ask properties.
   * @returns The options with question.
   */
  (context: AskCallbackContext, props: T): AskOptionsWithQuestion;
}

/** Ask function. */
export interface AskFunction<T extends AskProps = { rl: Interface }> {
  /**
   * Ask for user input.
   * @param question The question.
   * @param options Additional options.
   * @returns The answer.
   */
  (question: string, options?: AskOptions): Promise<string>;
  /**
   * Ask for user input.
   * @param callback The callback.
   * @returns The answer.
   */
  (callback: AskCallback<T>): Promise<string>;
}

/** Ask properties. */
export interface AskProps {
  /** The `readline.Interface`. */
  rl: Interface;
  [key: string]: any;
}

/** Ask function with additional methods. */
export interface Ask<T extends AskProps = { rl: Interface }>
  extends AskFunction<T> {
  /**
   * Create a scoped call.
   * The `readline.Interface` will close only after the `callback` is finished.
   * @param callback The scoped callback function with the `ask` function.
   * @returns The result of `callback`.
   */
  scoped<R>(callback: (ask: AskFunction<T>, props: T) => R): R;
}
