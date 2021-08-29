import { createInterface, Interface } from 'readline';

/** Callback arguments for Ask. */
export interface AskCallbackArgs {
  /** The current prompt attempt. Starts at `0`. */
  iteration: number;
  /** The previous answer. Contains an empty string for the first iteration. */
  previousAnswer: string;
}

/** Ask options. */
export interface AskOptions {
  /** Trims the answer before `format(answer, args)` is called. */
  trim?: boolean;
  /**
   * Format the answer.
   * @param answer The answer.
   * @param args The callback arguments.
   * @returns The formatted answer.
   */
  format?(answer: string, args: AskCallbackArgs): string;
  /** List of valid answers or a callback that checks if the answer is valid. */
  accept?: boolean | string[] | ((answer: string) => boolean);
}

/** Ask options with question. */
export interface AskWithQuestionOptions extends AskOptions {
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
) => AskWithQuestionOptions;

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

/** Ask function with additional methods. */
export interface Ask extends AskFunction {
  /**
   * Create a scoped call.
   * The readline interface will close only after the `callback` is finished.
   * @param callback The scoped callback function with the `ask` function.
   * @returns The result of `callback`.
   */
  scoped<T>(callback: (ask: AskFunction) => T): T;
  /**
   * Use a custom readline interface.
   * @param rl The readline interface.
   * @returns A new `Ask` function using the provided `rl`.
   */
  use(rl: Interface): Ask;
}

async function main(
  rl: Interface,
  question: string | AskCallbackOptions,
  options?: AskOptions
): Promise<string> {
  let answer: string = '';
  // don't quit until conditions are met
  for (let iteration: number = 0; true; iteration++) {
    const callbackArgs: AskCallbackArgs = {
      iteration,
      previousAnswer: answer
    };
    const opts: AskWithQuestionOptions =
      typeof question === 'function'
        ? question(callbackArgs)
        : { ...options, question };
    answer = await new Promise(resolve => {
      rl.question(opts.question, resolve);
    });
    // format answer
    if (opts.trim) {
      answer = answer.trim();
    }
    if (typeof opts.format === 'function') {
      answer = opts.format(answer, callbackArgs);
    }

    // check answer if valid
    const { accept } = opts;
    const doAccept: boolean =
      typeof accept === 'boolean'
        ? accept
        : typeof accept === 'function'
        ? accept(answer)
        : !Array.isArray(accept) || accept.includes(answer);
    if (doAccept) {
      break;
    }
  }
  return answer;
}

function createAsk<IsRoot extends boolean>(
  isRoot: IsRoot,
  initialRl?: Interface
): IsRoot extends true ? Ask : AskFunction {
  // close interface only for root ask call
  function askFn(
    question: string | AskCallbackOptions,
    options?: AskOptions
  ): Promise<string> {
    const rl: Interface =
      initialRl || createInterface(process.stdin, process.stdout);
    return main(rl, question, options).finally(() => {
      if (isRoot) {
        rl.close();
      }
    });
  }

  function scoped<T>(callback: (ask: AskFunction) => T): T {
    const rl: Interface =
      initialRl || createInterface(process.stdin, process.stdout);
    const result: T = callback(createAsk(false, rl));
    if (isRoot) {
      if (result instanceof Promise) {
        result.finally(() => rl.close());
      } else {
        rl.close();
      }
    }
    return result;
  }

  function use(rl: Interface): Ask {
    return createAsk(true, rl);
  }

  const ask: Ask = askFn as Ask;
  if (isRoot) {
    ask.scoped = scoped;
    ask.use = use;
  }
  return ask;
}

export const ask: Ask = createAsk(true);

export default ask;
