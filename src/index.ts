import { createInterface, Interface } from 'readline';

export interface AskOptions {
  trim?: boolean;
  /** List of valid answers or a callback that checks if the answer is valid. */
  accept?: boolean | string[] | ((answer: string) => boolean);
}

export interface AskCallbackArgs {
  iteration: number;
  previousAnswer: string;
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
}

async function main(
  rl: Interface,
  question: string | AskCallbackOptions,
  options?: AskOptions
): Promise<string> {
  let answer: string = '';
  // don't quit until conditions are met
  for (let iteration: number = 0; true; iteration++) {
    const opts: AskWithQuestionOptions =
      typeof question === 'function'
        ? question({ iteration, previousAnswer: answer })
        : { ...options, question };
    answer = await new Promise(resolve => {
      rl.question(opts.question, resolve);
    });
    const { trim, accept } = opts;
    if (trim) {
      answer = answer.trim();
    }
    // check answer if valid
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

  const ask: Ask = askFn as Ask;
  if (isRoot) {
    ask.scoped = scoped;
  }
  return ask;
}

export const ask: Ask = createAsk(true);

export default ask;
