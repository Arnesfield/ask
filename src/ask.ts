import { createInterface, Interface } from 'readline';
import {
  Ask,
  AskCallback,
  AskCallbackContext,
  AskFunction,
  AskOptions,
  AskOptionsWithQuestion,
  AskProps
} from './types';

/**
 * The main function that runs the `rl.question()` and receives
 * the answer with additional formatting and validation.
 * @param props The Ask properties.
 * @param question The question or callback.
 * @param options Additional options.
 * @returns The answer.
 */
async function main<T extends AskProps = { rl: Interface }>(
  props: T,
  question: string | AskCallback<T>,
  options?: AskOptions
): Promise<string> {
  const { rl } = props;
  let answer: string = '';
  // don't quit until conditions are met
  for (let iteration: number = 0; true; iteration++) {
    const context: AskCallbackContext = {
      iteration,
      previousAnswer: answer
    };
    const opts: AskOptionsWithQuestion =
      typeof question === 'function'
        ? question(context, props)
        : { ...options, question };
    answer = await new Promise(resolve => {
      rl.question(opts.question, resolve);
    });
    // format answer
    if (opts.trim) {
      answer = answer.trim();
    }
    if (typeof opts.format === 'function') {
      answer = opts.format(answer, context);
    }

    // check answer if valid
    const { accept } = opts;
    const doAccept: boolean | Promise<boolean> =
      typeof accept === 'boolean'
        ? accept
        : typeof accept === 'function'
        ? accept(answer)
        : !Array.isArray(accept) || accept.includes(answer);
    if (doAccept instanceof Promise ? await doAccept : doAccept) {
      break;
    }
  }
  return answer;
}

/**
 * Create an Ask function.
 * @param init The `init` callback.
 * @param close Determines if the `readline.Interface` should be closed after the question.
 * @returns The Ask function.
 */
function createAskFunction<T extends AskProps = { rl: Interface }>(
  init: () => T,
  close: boolean = true
): AskFunction<T> {
  return async (
    question: string | AskCallback<T>,
    options?: AskOptions
  ): Promise<string> => {
    const props: T = init();
    const { rl } = props;
    try {
      return await main(props, question, options);
    } finally {
      if (close) {
        rl.close();
      }
    }
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

  ask.scoped = <R>(callback: (ask: AskFunction<T>, props: T) => R): R => {
    const props: T = init();
    const { rl } = props;
    let result: R | undefined;
    try {
      result = callback(
        createAskFunction(() => props, false),
        props
      );
    } finally {
      // handle possible error for non-async callback
      if (!(result instanceof Promise)) {
        rl.close();
      }
    }
    if (result instanceof Promise) {
      result.catch(() => {}).finally(() => rl.close());
    }
    return result;
  };

  return ask;
}

/** The main Ask function. */
export const ask: Ask = createAsk();

export default ask;
