import { createInterface, Interface } from 'readline';

export interface AskOptions {
  trim?: boolean;
  /** List of valid answers. */
  accept?: string[] | ((answer: string) => boolean);
  /** List of invalid answers. */
  refuse?: string[] | ((answer: string) => boolean);
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

export interface Ask {
  (question: string, options?: AskOptions): Promise<string>;
  (callback: AskCallbackOptions): Promise<string>;
  many<T>(callback: (ask: Ask) => T): T;
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
    if (opts.trim) {
      answer = answer.trim();
    }
    // check answer against accept and reject list
    const doAccept: boolean =
      typeof opts.accept === 'function'
        ? opts.accept(answer)
        : !Array.isArray(opts.accept) || opts.accept.includes(answer);
    const doRefuse: boolean =
      typeof opts.refuse === 'function'
        ? opts.refuse(answer)
        : Array.isArray(opts.refuse)
        ? opts.refuse.includes(answer)
        : false;
    if (doAccept && !doRefuse) {
      break;
    }
  }
  return answer;
}

function createAsk(initialRl?: Interface): Ask {
  // close interface only for root ask call
  const close: boolean = !initialRl;

  function askFn(
    question: string | AskCallbackOptions,
    options?: AskOptions
  ): Promise<string> {
    const rl: Interface =
      initialRl || createInterface(process.stdin, process.stdout);
    return main(rl, question, options).finally(() => {
      if (close) {
        rl.close();
      }
    });
  }

  function many<T>(callback: (ask: Ask) => T): T {
    const rl: Interface =
      initialRl || createInterface(process.stdin, process.stdout);
    const result: T = callback(createAsk(rl));
    if (close) {
      if (result instanceof Promise) {
        result.finally(() => rl.close());
      } else {
        rl.close();
      }
    }
    return result;
  }

  const ask: Ask = askFn as Ask;
  ask.many = many;
  return ask;
}

export const ask: Ask = createAsk();

export default ask;
