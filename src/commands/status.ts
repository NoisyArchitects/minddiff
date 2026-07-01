import { readState, isPidAlive, getAllSessions, getSessionMemory } from '../storage/db.js';
import { theme } from '../utils/theme.js';

export function statusCommand() {
  const state = readState();
  const activeSessionIds = Object.keys(state.activeSessions);
  
  console.log(`\n${theme.bold(theme.accent('MindDiff Status:'))}`);
  console.log(theme.dim('='.repeat(80)));

  let activeCount = 0;
  for (const sessionId of activeSessionIds) {
    const session = state.activeSessions[sessionId];
    const isAlive = session.pid ? isPidAlive(session.pid) : true;
    if (session.isRunning && isAlive) {
      console.log(`${theme.success('●')} ${theme.bold('Active Session:')} ${theme.bold(sessionId)} ${theme.dim(`(PID: ${session.pid})`)}`);
      activeCount++;
    }
  }

  if (activeCount === 0) {
    console.log(`${theme.dim('○')} No active capturing sessions running.`);
  }

  console.log(`\n${theme.bold(theme.highlight('Recent History:'))}`);
  console.log(theme.dim('-'.repeat(80)));

  const sessions = getAllSessions().slice(0, 3);
  if (sessions.length === 0) {
    console.log(`  No history available yet. Start your first session with "${theme.highlight('minddiff run')}".`);
  } else {
    for (const session of sessions) {
      const ledger = getSessionMemory(session.id);
      const intent = ledger && ledger.memories && ledger.memories.length > 0
        ? (ledger.memories[0].inferred.intent || 'Analyze system state')
        : `Run ${session.agent} ${session.args.join(' ')}`;
      const dateStr = new Date(session.createdAt).toLocaleDateString();
      console.log(`  • [${theme.dim(dateStr)}] ${theme.bold(session.id)} ${theme.dim(`(Agent: ${session.agent})`)}`);
      console.log(`    ${theme.bold('Intent:')} ${theme.dim(intent)}`);
    }
    console.log(`\n  Tip: Run "${theme.highlight('minddiff history')}" to see all previous sessions.`);
  }
  console.log(theme.dim('='.repeat(80)) + '\n');
}
