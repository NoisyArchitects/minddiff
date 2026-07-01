import * as readline from 'node:readline';
import { theme } from './theme.js';

export function selectPrompt(message: string, options: string[]): Promise<number> {
  return new Promise((resolve) => {
    let cursor = 0;
    
    // Create readline interface to capture TTY state cleanly
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.emitKeypressEvents(process.stdin, rl);
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }

    const render = () => {
      // Clear from current cursor position down
      process.stdout.write('\r\u001b[J');
      
      const coloredMsg = message.replace(
        /(MindDiff works best alongside Git|MindDiff needs to initialize this project)/g,
        (m) => theme.bold(theme.accent(m))
      );
      process.stdout.write(`${coloredMsg}\n\n`);
      
      options.forEach((opt, idx) => {
        const isSelected = idx === cursor;
        const pointer = isSelected ? theme.highlight(' ➔ ') : '   ';
        const text = isSelected ? theme.bold(theme.accent(opt)) : theme.dim(opt);
        process.stdout.write(`${pointer} ${text}\n`);
      });
      process.stdout.write(`\n${theme.dim('Use ↑/↓ keys to navigate, Enter to select')}\n`);
    };

    // Hide cursor
    process.stdout.write('\u001b[?25l');
    render();

    const cleanup = () => {
      // Show cursor
      process.stdout.write('\u001b[?25h');
      process.stdin.removeListener('keypress', onKeypress);
      if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
      }
      rl.close();
    };

    const onKeypress = (str: string, key: any) => {
      if (key.ctrl && key.name === 'c') {
        cleanup();
        process.exit(0);
      }

      if (key.name === 'up') {
        cursor = (cursor - 1 + options.length) % options.length;
        const msgLines = message.split('\n').length;
        const linesToMove = options.length + msgLines + 3;
        process.stdout.write(`\u001b[${linesToMove}F`);
        render();
      } else if (key.name === 'down') {
        cursor = (cursor + 1) % options.length;
        const msgLines = message.split('\n').length;
        const linesToMove = options.length + msgLines + 3;
        process.stdout.write(`\u001b[${linesToMove}F`);
        render();
      } else if (key.name === 'return' || key.name === 'enter') {
        const msgLines = message.split('\n').length;
        const linesToClean = options.length + msgLines + 3;
        process.stdout.write(`\u001b[${linesToClean}F\r\u001b[J`);
        cleanup();
        resolve(cursor);
      }
    };

    process.stdin.on('keypress', onKeypress);
  });
}

export function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(theme.bold(theme.highlight(query)), (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
