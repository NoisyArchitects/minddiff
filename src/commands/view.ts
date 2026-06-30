import { getSession, getSessionMemory, getCommitMetadata } from '../storage/db.js';

export function viewCommand(sessionId: string) {
  if (!sessionId) {
    console.error('Usage: minddiff view <session-id>');
    process.exit(1);
  }

  const session = getSession(sessionId);
  if (!session) {
    console.error(`Error: Session "${sessionId}" not found.`);
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  console.log(`SESSION: ${session.id}`);
  console.log(`Agent:   ${session.agent} ${session.args.join(' ')}`);
  console.log(`Created: ${new Date(session.createdAt).toLocaleString()}`);
  console.log('='.repeat(80));

  // Render Associated Commits
  if (session.commits.length > 0) {
    console.log('\nGit Commits:');
    for (const sha of session.commits) {
      const commit = getCommitMetadata(sha);
      if (commit) {
        console.log(`  [${sha.substring(0, 7)}] ${commit.message.split('\n')[0]}`);
      } else {
        console.log(`  [${sha.substring(0, 7)}] (No local commit metadata cached)`);
      }
    }
  } else {
    console.log('\nGit Commits: None');
  }

  // Render Memories
  const ledger = getSessionMemory(sessionId);
  if (ledger && ledger.memories && ledger.memories.length > 0) {
    console.log('\nCompiled Cognitive Memories:');
    console.log('-'.repeat(80));
    for (const mem of ledger.memories) {
      const sourceIndicator = mem.source === 'user' ? '👤 [User Input]' : mem.source === 'system' ? '💻 [System Output]' : '🧠 [Agent Thought]';
      console.log(`\n${sourceIndicator} - ${new Date(mem.timestamp).toLocaleTimeString()}`);
      console.log(`Intent/Action: ${mem.observed.summary || mem.inferred.intent}`);
      
      if (mem.inferred.tags && mem.inferred.tags.length > 0) {
        const tagList = mem.inferred.tags.map(t => `${t.name} (${Math.round(t.confidence * 100)}%)`).join(', ');
        console.log(`Tags:          ${tagList}`);
      }

      if (mem.inferred.constraints && mem.inferred.constraints.length > 0) {
        console.log('Constraints Detected:');
        for (const constraint of mem.inferred.constraints) {
          console.log(`  ⚠️  ${constraint}`);
        }
      }

      // Print a preview of the clean text (up to 3 lines)
      const lines = mem.text.trim().split('\n');
      if (lines.length > 0 && lines[0].length > 0) {
        console.log('Content Preview:');
        const previewLines = lines.slice(0, 3);
        for (const line of previewLines) {
          console.log(`  | ${line}`);
        }
        if (lines.length > 3) {
          console.log(`  | ... (${lines.length - 3} more lines)`);
        }
      }
    }
  } else {
    console.log('\nCompiled Cognitive Memories: None (Memory compiler has not run or no memories were emitted).');
  }
  console.log('\n' + '='.repeat(80) + '\n');
}
