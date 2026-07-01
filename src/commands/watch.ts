import { spawn } from 'node:child_process';
import { getLatestLogFile } from '../storage/db.js';
import { theme } from '../utils/theme.js';

export function watchCommand() {
  const latestLog = getLatestLogFile();
  
  if (!latestLog) {
    console.error(theme.warning('No captured logs found. Run a developer session first (e.g., "minddiff run gemini").'));
    process.exit(1);
  }

  console.log(`-- MindDiff: Watching latest log: ${latestLog} --\n`);

  // Simple tail -f using child_process.spawn
  const tail = spawn('tail', ['-f', latestLog], {
    stdio: 'inherit'
  });

  tail.on('close', (code: number | null) => {
    process.exit(code ?? 0);
  });
}
