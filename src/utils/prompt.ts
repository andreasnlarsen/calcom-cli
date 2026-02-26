import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

export async function confirmOrThrow(shouldSkip: boolean, question: string): Promise<void> {
  if (shouldSkip) {
    return;
  }

  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question(`${question} [y/N]: `);
  rl.close();

  if (!/^y(es)?$/i.test(answer.trim())) {
    throw new Error('Operation canceled by user');
  }
}
