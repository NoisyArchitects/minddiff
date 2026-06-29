import { runCommand } from './run.js';

export async function geminiCommand(args: string[]) {
  const code = await runCommand('gemini', args);
  if (code !== 0) {
    process.exit(code);
  }
}
