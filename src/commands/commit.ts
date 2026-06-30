import { getCommitMetadata, getSession, getSessionMemory } from '../storage/db.js';

export function commitCommand(sha: string) {
  if (!sha) {
    console.error('Usage: minddiff commit <sha>');
    process.exit(1);
  }

  // Allow short SHAs by scanning the commits directory
  let fullSha = sha;
  const commit = getCommitMetadata(fullSha);
  
  if (!commit) {
    // If not found, check if it's a partial SHA
    console.error(`Error: Commit metadata for "${sha}" not found in MindDiff database.`);
    console.error('Make sure you have committed this change and that MindDiff sync was executed.');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  console.log(`COMMIT:       ${commit.sha}`);
  console.log(`Date:         ${new Date(commit.timestamp).toLocaleString()}`);
  console.log(`Message:      ${commit.message.trim()}`);
  
  if (commit.filesChanged && commit.filesChanged.length > 0) {
    console.log('Files Changed:');
    for (const f of commit.filesChanged) {
      console.log(`  └─ ${f}`);
    }
  }
  console.log('='.repeat(80));

  if (commit.associatedSessions && commit.associatedSessions.length > 0) {
    console.log('\nAssociated Developer Sessions:');
    for (const sessionId of commit.associatedSessions) {
      const session = getSession(sessionId);
      if (!session) continue;
      
      console.log(`\n• Session: ${session.id} (Agent: ${session.agent})`);
      
      const ledger = getSessionMemory(sessionId);
      if (ledger && ledger.memories && ledger.memories.length > 0) {
        console.log('  Cognitive Context:');
        for (const mem of ledger.memories) {
          // Highlight planning or debugging intent before the commit happened
          const tagsStr = mem.inferred.tags.map(t => t.name).join(', ');
          console.log(`    - [${mem.source}] ${mem.inferred.intent || mem.observed.summary} (tags: ${tagsStr})`);
        }
      } else {
        console.log('  No compiled memories found for this session.');
      }
    }
  } else {
    console.log('\nNo associated MindDiff developer sessions recorded for this commit.');
  }
  console.log('\n');
}
