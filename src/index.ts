import { createInterface, Interface } from 'readline';

export interface AskCallbackArgs {
  iteration: number;
  previousAnswer: string;
}

export interface AskOptions {
  trim?: boolean;
  format?(answer: string, args: AskCallbackArgs): string;
  /** List of valid answers or a callback that checks if the answer is valid. */
  accept?: boolean | string[] | ((answer: string) => boolean);
}

export interface AskWithQuestionOptions extends AskOptions {
  question: string;
}

export type AskCallbackOptions = (
  args: AskCallbackArgs
) => AskWithQuestionOptions;

export interface AskFunction {
  (question: string, options?: AskOptions): Promise<string>;
  (callback: AskCallbackOptions): Promise<string>;
}

export interface Ask extends AskFunction {
  scoped<T>(callback: (ask: AskFunction) => T): T;
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
