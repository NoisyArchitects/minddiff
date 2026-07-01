import { getAllSessions, getSessionRawLog } from '../storage/db.js';
import { reconstructTerminal } from '../compiler/passes/reconstruct.js';
import { cleanTerminalText } from '../compiler/passes/clean.js';
import { selectPrompt } from '../utils/prompt.js';
import { theme } from '../utils/theme.js';

export async function logCommand(sessionId?: string) {
  let targetSessionId = sessionId;

  // Resolve missing argument interactively
  if (!targetSessionId) {
    if (process.stdout.isTTY && process.stdin.isTTY) {
      const sessions = getAllSessions().slice(0, 15);
      if (sessions.length === 0) {
        console.error(theme.warning('No captured sessions found. Capture one using "minddiff run".'));
        process.exit(1);
      }
      
      const sessionOptions = sessions.map(s => {
        const dateStr = new Date(s.createdAt).toLocaleDateString();
        return `${s.id} (Agent: ${s.agent}) - ${dateStr}`;
      });
      sessionOptions.push('Cancel');
      
      const choice = await selectPrompt('Select Session to View Log', sessionOptions);
      if (choice === sessionOptions.length - 1) {
        console.log('Aborted.');
        process.exit(0);
      }
      targetSessionId = sessions[choice].id;
    } else {
      console.log(theme.bold('\nMindDiff Session Log Viewer'));
      console.log(theme.dim('==================================='));
      console.log('Print the reconstructed, cleaned text transcript of a session (removing ANSI escapes).');
      console.log('\nUsage:');
      console.log('  minddiff log <session-id>');
      console.log('\nExamples:');
      console.log('  minddiff log session-1234');
      
      const sessions = getAllSessions();
      if (sessions.length > 0) {
        console.log('\nAvailable sessions:');
        sessions.slice(0, 5).forEach(s => {
          console.log(`  - ${s.id} (Agent: ${s.agent})`);
        });
      } else {
        console.log('\nNo sessions recorded yet. Start one with "minddiff run".');
      }
      console.log('');
      process.exit(0);
    }
  }

  const rawLog = getSessionRawLog(targetSessionId);
  if (rawLog === null) {
    console.error(theme.warning(`Error: Could not retrieve raw logs for session "${targetSessionId}".`));
    process.exit(1);
  }

  console.log(`\n${theme.bold(theme.accent(`-- MindDiff Clean Transcript: ${targetSessionId} --`))}\n`);

  // Clean raw ANSI stream on the fly for human consumption
  const reconstructed = reconstructTerminal(rawLog);
  const cleaned = cleanTerminalText(reconstructed);

  console.log(cleaned);
  console.log(`\n${theme.bold(theme.accent('-- End of Transcript --'))}\n`);
}
