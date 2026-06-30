import { getAllSessions, getSessionMemory } from '../storage/db.js';

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) return 'just now'; // timezone skew safety
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'yesterday';
  return `${diffDays}d ago`;
}

export function historyCommand() {
  const sessions = getAllSessions();

  if (sessions.length === 0) {
    console.log('No captured sessions found. Initialize a session using "minddiff run <agent>".');
    return;
  }

  console.log('\nMindDiff History:');
  console.log('='.repeat(110));
  
  // Header
  const colId = 'SESSION ID'.padEnd(45);
  const colAgent = 'AGENT'.padEnd(12);
  const colTime = 'TIME'.padEnd(14);
  const colCommits = 'COMMITS'.padEnd(9);
  const colIntent = 'PRIMARY INTENT';
  console.log(`${colId}${colAgent}${colTime}${colCommits}${colIntent}`);
  console.log('-'.repeat(110));

  for (const session of sessions) {
    const ledger = getSessionMemory(session.id);
    const primaryIntent = ledger && ledger.memories && ledger.memories.length > 0
      ? ledger.memories[0].inferred.intent || 'Analyze system state'
      : (session.args.length > 0 ? `run ${session.agent} ${session.args.join(' ')}` : `run ${session.agent}`);

    const idStr = session.id.padEnd(45);
    const agentStr = session.agent.substring(0, 10).padEnd(12);
    const timeStr = getRelativeTime(session.createdAt).padEnd(14);
    const commitsStr = String(session.commits.length).padEnd(9);
    const intentStr = primaryIntent.length > 30 ? primaryIntent.substring(0, 27) + '...' : primaryIntent;

    console.log(`${idStr}${agentStr}${timeStr}${commitsStr}${intentStr}`);
  }
  console.log('='.repeat(110));
  console.log(`Total sessions: ${sessions.length}\n`);
}
