import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDbDirectory, getCommitMetadata, getSession, getSessionMemory, CommitMetadata } from '../storage/db.js';
import { selectPrompt } from '../utils/prompt.js';
import { theme } from '../utils/theme.js';

export async function commitCommand(sha?: string) {
  let targetSha = sha;

  // Resolve missing argument interactively
  if (!targetSha) {
    if (process.stdout.isTTY && process.stdin.isTTY) {
      const commitDir = join(getDbDirectory(), 'commits');
      let commits: CommitMetadata[] = [];
      if (existsSync(commitDir)) {
        try {
          const files = readdirSync(commitDir).filter(f => f.endsWith('.json'));
          for (const file of files) {
            const data = readFileSync(join(commitDir, file), 'utf8');
            commits.push(JSON.parse(data) as CommitMetadata);
          }
          commits.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        } catch {}
      }

      if (commits.length === 0) {
        console.error(theme.warning('No synced commits found in MindDiff database.\nMake sure you have committed changes under a running session.'));
        process.exit(1);
      }

      const commitOptions = commits.slice(0, 15).map(c => {
        const dateStr = new Date(c.timestamp).toLocaleDateString();
        const msg = c.message.split('\n')[0].trim();
        const msgTrunc = msg.length > 40 ? msg.substring(0, 37) + '...' : msg;
        return `[${c.sha.substring(0, 7)}] ${msgTrunc} (${dateStr})`;
      });
      commitOptions.push('Cancel');

      const choice = await selectPrompt('Select Git Commit to Explain', commitOptions);
      if (choice === commitOptions.length - 1) {
        console.log('Aborted.');
        process.exit(0);
      }
      targetSha = commits[choice].sha;
    } else {
      console.error(theme.warning('Usage: minddiff commit <sha>'));
      process.exit(1);
    }
  }

  // Allow short SHAs by scanning the commits directory
  const commit = getCommitMetadata(targetSha);
  
  if (!commit) {
    console.error(theme.warning(`Error: Commit metadata for "${targetSha}" not found in MindDiff database.`));
    console.error('Make sure you have committed this change and that MindDiff sync was executed.');
    process.exit(1);
  }

  console.log('\n' + theme.dim('='.repeat(80)));
  console.log(`${theme.bold(theme.accent('COMMIT:'))}       ${theme.bold(commit.sha)}`);
  console.log(`${theme.bold('Date:')}         ${new Date(commit.timestamp).toLocaleString()}`);
  console.log(`${theme.bold('Message:')}      ${commit.message.trim()}`);
  
  if (commit.filesChanged && commit.filesChanged.length > 0) {
    console.log(`${theme.bold('Files Changed:')}`);
    for (const f of commit.filesChanged) {
      console.log(`  └─ ${theme.dim(f)}`);
    }
  }
  console.log(theme.dim('='.repeat(80)));

  if (commit.associatedSessions && commit.associatedSessions.length > 0) {
    console.log(`\n${theme.bold('Associated Developer Sessions:')}`);
    for (const sessionId of commit.associatedSessions) {
      const session = getSession(sessionId);
      if (!session) continue;
      
      console.log(`\n• Session: ${theme.bold(session.id)} ${theme.dim(`(Agent: ${session.agent})`)}`);
      
      const ledger = getSessionMemory(sessionId);
      if (ledger && ledger.memories && ledger.memories.length > 0) {
        console.log(`  ${theme.bold('Cognitive Context:')}`);
        for (const mem of ledger.memories) {
          const tagsStr = mem.inferred.tags.map(t => t.name).join(', ');
          console.log(`    - [${theme.highlight(mem.source)}] ${mem.inferred.intent || mem.observed.summary} ${theme.dim(`(tags: ${tagsStr})`)}`);
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
