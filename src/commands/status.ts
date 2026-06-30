import { readState, isPidAlive, getAllSessions, getSessionMemory } from '../storage/db.js';

export function statusCommand() {
  const state = readState();
  const activeSessionIds = Object.keys(state.activeSessions);
  
  console.log('\nMindDiff Status:');
  console.log('='.repeat(80));

  let activeCount = 0;
  for (const sessionId of activeSessionIds) {
    const session = state.activeSessions[sessionId];
    const isAlive = session.pid ? isPidAlive(session.pid) : true;
    if (session.isRunning && isAlive) {
      console.log(`🟢 Active Session: ${sessionId} (PID: ${session.pid})`);
      activeCount++;
    }
  }

  if (activeCount === 0) {
    console.log('⚪ No active capturing sessions running.');
  }

  console.log('\nRecent History:');
  console.log('-'.repeat(80));

  const sessions = getAllSessions().slice(0, 3);
  if (sessions.length === 0) {
    console.log('  No history available yet. Start your first session with "minddiff run <agent>".');
  } else {
    for (const session of sessions) {
      const ledger = getSessionMemory(session.id);
      const intent = ledger && ledger.memories && ledger.memories.length > 0
        ? ledger.memories[0].inferred.intent
        : `Run ${session.agent} ${session.args.join(' ')}`;
      const dateStr = new Date(session.createdAt).toLocaleDateString();
      console.log(`  • [${dateStr}] ${session.id} (Agent: ${session.agent})`);
      console.log(`    Intent: ${intent}`);
    }
    console.log('\n  Tip: Run "minddiff history" to see all previous sessions.');
  }
  console.log('='.repeat(80) + '\n');
}
