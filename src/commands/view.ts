import { getSession, getSessionMemory, getCommitMetadata, getAllSessions } from '../storage/db.js';
import { buildEpisodes } from '../compiler/episodes.js';
import { selectPrompt } from '../utils/prompt.js';
import { theme } from '../utils/theme.js';

export async function viewCommand(sessionId?: string, options: { raw?: boolean; json?: boolean } = {}) {
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
      
      const choice = await selectPrompt('Select Session to View', sessionOptions);
      if (choice === sessionOptions.length - 1) {
        console.log('Aborted.');
        process.exit(0);
      }
      targetSessionId = sessions[choice].id;
    } else {
      console.log(theme.bold('\nMindDiff Session Viewer'));
      console.log(theme.dim('==================================='));
      console.log('View the semantic goal episodes and cognitive timeline of a captured developer session.');
      console.log('\nUsage:');
      console.log('  minddiff view <session-id> [--raw] [--json]');
      console.log('\nOptions:');
      console.log('  --raw      Print flat, chronological memory blocks');
      console.log('  --json     Output raw compiled database JSON structure');
      console.log('\nExamples:');
      console.log('  minddiff view session-1234');
      console.log('  minddiff view session-1234 --raw');
      
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

  const session = getSession(targetSessionId);
  if (!session) {
    console.error(theme.warning(`Error: Session "${targetSessionId}" not found.`));
    process.exit(1);
  }

  const ledger = getSessionMemory(targetSessionId);
  if (!ledger) {
    console.error(theme.warning(`Error: Compiled memories not found for session "${targetSessionId}".`));
    process.exit(1);
  }

  // 1. JSON Mode: Print raw JSON data
  if (options.json) {
    console.log(JSON.stringify(ledger, null, 2));
    return;
  }

  // 2. Raw Mode: Print flat atomic memory blocks
  if (options.raw) {
    console.log('\n' + theme.dim('='.repeat(80)));
    console.log(`${theme.bold(theme.accent('SESSION:'))} ${theme.bold(session.id)}`);
    console.log(`${theme.bold('Agent:')}   ${session.agent} ${session.args.join(' ')}`);
    console.log(`${theme.bold('Created:')} ${new Date(session.createdAt).toLocaleString()}`);
    console.log(theme.dim('='.repeat(80)));

    if (session.commits.length > 0) {
      console.log(`\n${theme.bold('Git Commits:')}`);
      for (const sha of session.commits) {
        const commit = getCommitMetadata(sha);
        if (commit) {
          console.log(`  [${theme.highlight(sha.substring(0, 7))}] ${commit.message.split('\n')[0]}`);
        }
      }
    }

    if (ledger.memories && ledger.memories.length > 0) {
      console.log(`\n${theme.bold('Compiled Cognitive Memories (Raw Flat View):')}`);
      console.log(theme.dim('-'.repeat(80)));
      for (const mem of ledger.memories) {
        const sourceIndicator = mem.source === 'user' 
          ? theme.highlight('👤 [User Input]') 
          : mem.source === 'system' 
            ? theme.dim('💻 [System Output]') 
            : theme.accent('🧠 [Agent Thought]');
            
        console.log(`\n${sourceIndicator} - ${theme.dim(new Date(mem.timestamp).toLocaleTimeString())}`);
        console.log(`${theme.bold('Intent/Action:')} ${mem.observed.summary || mem.inferred.intent}`);
        
        if (mem.inferred.tags && mem.inferred.tags.length > 0) {
          const tagList = mem.inferred.tags.map(t => `${t.name} (${Math.round(t.confidence * 100)}%)`).join(', ');
          console.log(`${theme.bold('Tags:')}          ${tagList}`);
        }

        if (mem.inferred.constraints && mem.inferred.constraints.length > 0) {
          console.log(theme.warning('Constraints Detected:'));
          for (const constraint of mem.inferred.constraints) {
            console.log(`  ⚠️  ${constraint}`);
          }
        }

        const lines = mem.text.trim().split('\n');
        if (lines.length > 0 && lines[0].length > 0) {
          console.log(theme.dim('Content Preview:'));
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
    console.log('\n' + theme.dim('='.repeat(80)) + '\n');
    return;
  }

  // 3. Default Mode: Renders the Narrative Story using Episode Projections
  const episodes = buildEpisodes(ledger.memories);

  console.log('\n' + theme.dim('='.repeat(80)));
  console.log(`${theme.bold(theme.accent('SESSION:'))}  ${theme.bold(session.id)} ${theme.dim(`(Agent: ${session.agent})`)}`);
  console.log(`${theme.bold('Created:')}  ${new Date(session.createdAt).toLocaleString()}`);
  
  if (session.commits.length > 0) {
    const commitList = session.commits.map(sha => {
      const commit = getCommitMetadata(sha);
      return commit 
        ? `[${theme.highlight(sha.substring(0, 7))}: ${commit.message.split('\n')[0].trim()}]` 
        : `[${theme.highlight(sha.substring(0, 7))}]`;
    }).join(', ');
    console.log(`${theme.bold('Commits:')}  ${commitList}`);
  }
  console.log(theme.dim('='.repeat(80)));

  if (episodes.length === 0) {
    console.log('\nNo semantic goal episodes could be projected from this session.');
    console.log(theme.dim('='.repeat(80)) + '\n');
    return;
  }

  for (const ep of episodes) {
    console.log(`\n🎯 ${theme.bold(theme.accent('Goal:'))} ${theme.bold(ep.goal)}`);
    console.log(theme.dim('─'.repeat(80)));

    if (ep.actions.length > 0) {
      console.log(theme.bold('🛠️  Actions:'));
      for (let j = 0; j < ep.actions.length; j++) {
        const isLast = j === ep.actions.length - 1;
        const branchSymbol = isLast ? '└─' : '├─';
        const act = ep.actions[j];

        if (act.type === 'command') {
          console.log(`    ${theme.dim(branchSymbol)} Run: ${theme.highlight(act.target)}`);
          if (act.exitCode !== undefined) {
            const statusSymbol = act.exitCode === 0 
              ? theme.success('🟢 Success') 
              : theme.warning(`❌ Failed (Exit code ${act.exitCode})`);
            const nextSymbol = isLast ? ' ' : '│';
            console.log(`    ${theme.dim(nextSymbol)}  └─ ${statusSymbol}`);
          }
        } else {
          console.log(`    ${theme.dim(branchSymbol)} ${act.target}`);
        }
      }
    }

    const outcomeSymbol = ep.outcome.status === 'success' 
      ? theme.success('Success') 
      : ep.outcome.status === 'failure' 
        ? theme.warning('Failure') 
        : theme.highlight('In Progress');
    
    console.log(`\n📊 ${theme.bold('Outcome:')} [${outcomeSymbol}]`);
    if (ep.outcome.summary) {
      console.log(`    └─ ${ep.outcome.summary}`);
    }

    if (ep.reflection) {
      console.log(`\n🧠 ${theme.bold('Reflection:')}\n    "${theme.dim(ep.reflection.trim().replace(/\n/g, '\n    '))}"`);
    }
    console.log(theme.dim('═'.repeat(80)));
  }
  console.log('\n');
}
