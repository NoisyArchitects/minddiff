import { getAllSessions, getSessionMemory } from '../storage/db.js';
import { theme } from '../utils/theme.js';

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
    console.log(`No captured sessions found. Initialize a session using "${theme.highlight('minddiff run')}".`);
    return;
  }

  console.log(`\n${theme.bold(theme.accent('MindDiff History:'))}`);
  console.log(theme.dim('='.repeat(110)));
  
  // Header
  const colId = theme.bold('SESSION ID').padEnd(45 + theme.bold('').length);
  const colAgent = theme.bold('AGENT').padEnd(12 + theme.bold('').length);
  const colTime = theme.bold('TIME').padEnd(14 + theme.bold('').length);
  const colCommits = theme.bold('COMMITS').padEnd(9 + theme.bold('').length);
  const colIntent = theme.bold('PRIMARY INTENT');
  
  // Print headers cleanly without formatting padding calculation issues
  console.log(
    'SESSION ID'.padEnd(45) +
    'AGENT'.padEnd(12) +
    'TIME'.padEnd(14) +
    'COMMITS'.padEnd(9) +
    'PRIMARY INTENT'
  );
  console.log(theme.dim('-'.repeat(110)));

  for (const session of sessions) {
    const ledger = getSessionMemory(session.id);
    const primaryIntent = ledger && ledger.memories && ledger.memories.length > 0
      ? ledger.memories[0].inferred.intent || 'Analyze system state'
      : (session.args.length > 0 ? `run ${session.agent} ${session.args.join(' ')}` : `run ${session.agent}`);

    const idStr = theme.bold(session.id).padEnd(45 + theme.bold('').length); // padding adjustment for ansi bold
    const agentStr = session.agent.substring(0, 10).padEnd(12);
    const timeStr = getRelativeTime(session.createdAt).padEnd(14);
    const commitsStr = (session.commits.length > 0 ? theme.highlight(String(session.commits.length)) : '0').padEnd(9 + (session.commits.length > 0 ? theme.highlight('').length : 0));
    const intentStr = theme.dim(primaryIntent.length > 30 ? primaryIntent.substring(0, 27) + '...' : primaryIntent);

    // Let's print each row using styled strings
    console.log(
      session.id.padEnd(45) + 
      session.agent.substring(0, 10).padEnd(12) + 
      getRelativeTime(session.createdAt).padEnd(14) + 
      (session.commits.length > 0 ? theme.highlight(String(session.commits.length)) : '0').padEnd(9 + (session.commits.length > 0 ? theme.highlight('').length : 0)) + 
      theme.dim(primaryIntent.length > 30 ? primaryIntent.substring(0, 27) + '...' : primaryIntent)
    );
  }
  console.log(theme.dim('='.repeat(110)));
  console.log(`${theme.bold('Total sessions:')} ${theme.success(String(sessions.length))}\n`);
}
