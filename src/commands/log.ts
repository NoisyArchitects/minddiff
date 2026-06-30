import { getAllSessions, getSessionRawLog } from '../storage/db.js';
import { reconstructTerminal } from '../compiler/passes/reconstruct.js';
import { cleanTerminalText } from '../compiler/passes/clean.js';

export function logCommand(sessionId?: string) {
  let targetSessionId = sessionId;

  if (!targetSessionId) {
    const sessions = getAllSessions();
    if (sessions.length === 0) {
      console.error('No sessions found. Run a session first.');
      process.exit(1);
    }
    targetSessionId = sessions[0].id;
  }

  const rawLog = getSessionRawLog(targetSessionId);
  if (rawLog === null) {
    console.error(`Error: Could not retrieve raw logs for session "${targetSessionId}".`);
    process.exit(1);
  }

  console.log(`\n-- MindDiff Clean Transcript: ${targetSessionId} --\n`);

  // Clean raw ANSI stream on the fly for human consumption
  const reconstructed = reconstructTerminal(rawLog);
  const cleaned = cleanTerminalText(reconstructed);

  console.log(cleaned);
  console.log(`\n-- End of Transcript --\n`);
}
