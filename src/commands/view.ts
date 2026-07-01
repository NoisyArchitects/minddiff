import { getSession, getSessionMemory, getCommitMetadata } from '../storage/db.js';
import { buildEpisodes } from '../compiler/episodes.js';

export function viewCommand(sessionId: string, options: { raw?: boolean; json?: boolean } = {}) {
  if (!sessionId) {
    console.error('Usage: minddiff view <session-id> [--raw] [--json]');
    process.exit(1);
  }

  const session = getSession(sessionId);
  if (!session) {
    console.error(`Error: Session "${sessionId}" not found.`);
    process.exit(1);
  }

  const ledger = getSessionMemory(sessionId);
  if (!ledger) {
    console.error(`Error: Compiled memories not found for session "${sessionId}".`);
    process.exit(1);
  }

  // 1. JSON Mode: Print raw JSON data
  if (options.json) {
    console.log(JSON.stringify(ledger, null, 2));
    return;
  }

  // 2. Raw Mode: Print flat atomic memory blocks
  if (options.raw) {
    console.log('\n' + '='.repeat(80));
    console.log(`SESSION: ${session.id}`);
    console.log(`Agent:   ${session.agent} ${session.args.join(' ')}`);
    console.log(`Created: ${new Date(session.createdAt).toLocaleString()}`);
    console.log('='.repeat(80));

    if (session.commits.length > 0) {
      console.log('\nGit Commits:');
      for (const sha of session.commits) {
        const commit = getCommitMetadata(sha);
        if (commit) {
          console.log(`  [${sha.substring(0, 7)}] ${commit.message.split('\n')[0]}`);
        }
      }
    }

    if (ledger.memories && ledger.memories.length > 0) {
      console.log('\nCompiled Cognitive Memories (Raw Flat View):');
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
      console.log('\nNo memories compiled.');
    }
    console.log('\n' + '='.repeat(80) + '\n');
    return;
  }

  // 3. Default Mode: Renders the Narrative Story using Episode Projections
  const episodes = buildEpisodes(ledger.memories);

  console.log('\n' + '='.repeat(80));
  console.log(`SESSION:  ${session.id} (Agent: ${session.agent})`);
  console.log(`Created:  ${new Date(session.createdAt).toLocaleString()}`);
  
  if (session.commits.length > 0) {
    const commitList = session.commits.map(sha => {
      const commit = getCommitMetadata(sha);
      return commit ? `[${sha.substring(0, 7)}: ${commit.message.split('\n')[0].trim()}]` : `[${sha.substring(0, 7)}]`;
    }).join(', ');
    console.log(`Commits:  ${commitList}`);
  }
  console.log('='.repeat(80));

  if (episodes.length === 0) {
    console.log('\nNo semantic goal episodes could be projected from this session.');
    console.log('='.repeat(80) + '\n');
    return;
  }

  for (const ep of episodes) {
    console.log(`\n🎯 Goal: ${ep.goal}`);
    console.log('─'.repeat(80));

    if (ep.actions.length > 0) {
      console.log('🛠️  Actions:');
      for (let j = 0; j < ep.actions.length; j++) {
        const isLast = j === ep.actions.length - 1;
        const branchSymbol = isLast ? '└─' : '├─';
        const act = ep.actions[j];

        if (act.type === 'command') {
          console.log(`    ${branchSymbol} Run: ${act.target}`);
          if (act.exitCode !== undefined) {
            const statusSymbol = act.exitCode === 0 ? '🟢 Success' : `❌ Failed (Exit code ${act.exitCode})`;
            const nextSymbol = isLast ? ' ' : '│';
            console.log(`    ${nextSymbol}  └─ ${statusSymbol}`);
          }
        } else {
          console.log(`    ${branchSymbol} ${act.target}`);
        }
      }
    }

    const outcomeSymbol = ep.outcome.status === 'success' 
      ? '🟢 Success' 
      : ep.outcome.status === 'failure' 
        ? '❌ Failure' 
        : '🟡 In Progress';
    
    console.log(`\n📊 Outcome: ${outcomeSymbol}`);
    if (ep.outcome.summary) {
      console.log(`    └─ ${ep.outcome.summary}`);
    }

    if (ep.reflection) {
      console.log(`\n🧠 Reflection:\n    "${ep.reflection.trim().replace(/\n/g, '\n    ')}"`);
    }
    console.log('═'.repeat(80));
  }
  console.log('\n');
}
