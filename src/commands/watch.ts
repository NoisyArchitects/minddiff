import { spawn } from 'node:child_process';
import { getLatestLogFile } from '../storage/db.js';

export function watchCommand() {
  const latestLog = getLatestLogFile();
  
  if (!latestLog) {
    console.error('No logs found. Run a session first (e.g., "minddiff run gemini").');
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
