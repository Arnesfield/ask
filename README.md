# ask

Ask for user input via CLI.

Creates a `readline.Interface` (`rl`) by default:

```js
rl: createInterface(process.stdin, process.stdout);
```

## Usage

```js
const answer = await ask('Question: ');
// output: Question: <input>
// answer: <input>
```

### Ask Options

1. The `trim` option calls `String.prototype.trim()` for the provided input.

   ```js
   const answer = await ask('Question: ', {
     trim: true
   });
   // output: Question: <input>
   // answer: <input.trim()>
   ```

2. The `format` option allows you to format the `answer` before it is evaluated through the `accept` option.

   ```js
   const answer = await ask('Question: ', {
     trim: true,
     format: answer => {
       return answer.concat('bar').toLowerCase();
     }
   });
   // output: Question: <input:  Foo  >
   // answer: foobar
   ```

3. The `accept` option can be a `boolean`, `string[]`, or a function returning a `boolean`. `ask` will continue to ask for input if `accept` resolves to `false`.

   With `boolean`:

   ```js
   const answer = await ask('Accept: ', {
     accept: true
   });
   // output: Accept: <input>
   // answer: <input>
   ```

   With `string[]`:

   ```js
   const answer = await ask('Continue [y/n]: ', {
     accept: ['y', 'n']
   });
   // output: Continue [y/n]: <input: foo>
   // output: Continue [y/n]: <input: >
   // output: Continue [y/n]: <input: Y>
   // output: Continue [y/n]: <input: N>
   // output: Continue [y/n]: <input: y>
   // answer: y
   ```

   With function:

   ```js
   const answer = await ask('Enter 8 or more: ', {
     accept: answer => answer.length >= 8
   });
   // output: Enter 8 or more: <input: foo>
   // output: Enter 8 or more: <input: foobarbaz>
   // answer: foobarbaz
   ```

4. The `on` option allows you to do stuff when an event is triggered.

   This can be helpful when you want to mute and unmute the output stream before and after the input respectively.

   - `beforeAsk` - Before `rl.question()` is called.
   - `ask` - After `rl.question()` is called.
   - `answer` - After user input.

   Example:

   ```js
   const answer = await ask('Question: ', {
     on: event => {
       /* do stuff */
     }
   });
   ```

### Ask Callback

The Ask callback exposes the `context` and `props` objects. The callback returns an object (Ask options) including the `question` string.

- The `context` object contains the `iteration` number (starts at `0`) and the `previousAnswer` (defaults to `''`).
- The `props` object contains the `rl` being used. You can add more properties to the `props` object via the `createAsk` function.

```js
const answer = await ask((context, props) => {
  const { iteration, previousAnswer } = context;
  const n = iteration + 1;
  return {
    question: `${n}. Question [${previousAnswer}]: `,
    accept: ['y', 'n']
  };
});
// output: 1. Question []: <input: foo>
// output: 2. Question [foo]: <input: bar>
// output: 3. Question [bar]: <input: baz>
// output: 4. Question [baz]: <input: n>
// answer: n
```

### `createAsk(callback)`

You can create your own Ask function with additional properties. Example:

```js
const myAsk = createAsk(() => {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return {
    rl,
    mute: () => {
      /* do stuff */
    },
    unmute: () => {
      /* do stuff */
    }
  };
});

// ...

const answer = await myAsk((context, props) => {
  return {
    question: 'Question: ',
    on: event => {
      if (event === 'ask') {
        props.mute();
      } else {
        props.unmute();
      }
    }
  };
});
// <props.unmute()>
// output: Question: <props.mute()><input>
// <props.unmute()>
// answer: <input>
```

### `ask.scoped(callback)`

The `ask.scoped(callback)` function reuses the same `rl` instance and will call `rl.close()` after the callback is finished.

The `callback(q, props)` parameters include the Ask function and the `props`. Example:

```js
const result = await ask.scoped(async (q, props) => {
  // basic usage
  const a1 = await q('Question 1: ');
  // with options
  const a2 = await q('Question 2: ', {
    accept: ['y', 'n']
  });
  // with callback
  const a3 = await q(context => {
    const { previousAnswer } = context;
    return {
      question: `Question 3 [${previousAnswer}]: `,
      accept: answer => answer.length >= 8
    };
  });
  return { a1, a2, a3 };
});
// output: Question 1: <input1>
// output: Question 2: <input2: foo>
// output: Question 2: <input2: y>
// output: Question 3 []: <input3: foo>
// output: Question 3 [foo]: <input3: bar>
// output: Question 3 [bar]: <input3: foobarbaz>
// result: { a1: <input1>, a2: 'y', a3: 'foobarbaz' }
```
