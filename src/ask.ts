import { createInterface, Interface } from 'readline';
import {
  Ask,
  AskCallbackArgs,
  AskCallbackOptions,
  AskFunction,
  AskOptions,
  AskOptionsWithQuestion,
  AskProps
} from './types';

/**
 * The main function that runs the `rl.question()` and receives
 * the answer with additional formatting and validation.
 * @param rl The `readline.Interface`.
 * @param question The question or the callback options.
 * @param options Additional options.
 * @returns The answer.
 */
async function main(
  rl: Interface,
  question: string | AskCallbackOptions,
  options?: AskOptions
): Promise<string> {
  let answer: string = '';
  // don't quit until conditions are met
  for (let iteration: number = 0; true; iteration++) {
    const args: AskCallbackArgs = {
      iteration,
      previousAnswer: answer
    };
    const opts: AskOptionsWithQuestion =
      typeof question === 'function'
        ? question(args)
        : { ...options, question };
    answer = await new Promise(resolve => {
      rl.question(opts.question, resolve);
    });
    // format answer
    if (opts.trim) {
      answer = answer.trim();
    }
    if (typeof opts.format === 'function') {
      answer = opts.format(answer, args);
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

/**
 * Create an Ask function.
 * @param rlOrInit The `readline.Interface` or an `init` callback.
 * @param close Determines if the `readline.Interface` should be closed after the question.
 * @returns The Ask function.
 */
function createAskFunction(
  rlOrInit: Interface | (() => AskProps),
  close: boolean = true
): AskFunction {
  return (
    question: string | AskCallbackOptions,
    options?: AskOptions
  ): Promise<string> => {
    const rl: Interface =
      typeof rlOrInit === 'function' ? rlOrInit().rl : rlOrInit;
    const promise: Promise<string> = main(rl, question, options);
    if (close) {
      promise.finally(() => rl.close());
    }
    return promise;
  };
}

/**
 * Create an Ask function.
 * @param init Callback that returns properties passed to `ask.scoped()`.
 * @returns The Ask function.
 */
export function createAsk<T extends AskProps = { rl: Interface }>(
  init: () => T = () => {
    return { rl: createInterface(process.stdin, process.stdout) } as T;
  }
): Ask<T> {
  const ask = createAskFunction(init) as Ask<T>;

  ask.scoped = <R>(callback: (ask: AskFunction, props: T) => R): R => {
    const props: T = init();
    const { rl } = props;
    const result: R = callback(createAskFunction(rl, false), props);
    if (result instanceof Promise) {
      result.finally(() => rl.close());
    } else {
      rl.close();
    }
    return result;
  };

  return ask;
}

/** The main Ask function. */
export const ask: Ask = createAsk();

export default ask;
