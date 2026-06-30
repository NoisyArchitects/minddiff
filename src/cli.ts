#!/usr/bin/env node
import { existsSync } from 'node:fs';
import * as readline from 'node:readline';
import { geminiCommand } from './commands/gemini.js';
import { watchCommand } from './commands/watch.js';
import { initCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';
import { statusCommand } from './commands/status.js';
import { historyCommand } from './commands/history.js';
import { viewCommand } from './commands/view.js';
import { logCommand } from './commands/log.js';
import { commitCommand } from './commands/commit.js';
import { memoriesCommand } from './commands/memories.js';
import { syncCommits, isGitRepository, hasUncommittedChanges } from './storage/git.js';
import { getDbDirectory } from './storage/db.js';

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function printHelp() {
  console.log(`
MindDiff: Preserving cognitive traces alongside repository evolution.

================================================================================
CORE CONCEPTS
================================================================================
  Sessions   - Focused units of work captured from wrapped CLI agents or tools.
  Memories   - Semantic facts, intents, and code edits extracted from your work.
  Commits    - Git snapshots linked back to the developer sessions that produced them.

================================================================================
WORKFLOW COMMANDS
================================================================================

  1. Capture Work
    init                   Initialize MindDiff and configure Git hooks
    run <agent> [args...]  Run an agent (e.g. gemini, claude, agy) under capture
    watch                  Tail the live log stream of the active session

  2. Revisit & Navigate History
    status                 Show current active sessions & recent activity summary
    history                List all past sessions in chronological order
    view <session-id>      Inspect a session's metadata and compiled memories (alias: open)
    log [session-id]       Read the cleaned, human-readable transcript of a session
    commit <sha>           Show the session context and memories behind a Git commit
    memories [--tag <t>]   Browse a chronological timeline of all compiled memories

  3. Synchronization
    sync                   Manually sync pending commits with active sessions
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const remainingArgs = args.slice(1);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case 'init':
      initCommand();
      break;
    case 'run':
      if (remainingArgs.length === 0) {
        console.error('Usage: minddiff run <agent> [args...]');
        process.exit(1);
      }
      const agent = remainingArgs[0];
      const agentArgs = remainingArgs.slice(1);
      const code = await runCommand(agent, agentArgs);
      process.exit(code);
    case 'gemini':
      await geminiCommand(remainingArgs);
      break;
    case 'watch':
      watchCommand();
      break;
    case 'status':
      statusCommand();
      break;
    case 'history':
      historyCommand();
      break;
    case 'view':
    case 'open':
      if (remainingArgs.length === 0) {
        console.error('Usage: minddiff view <session-id>');
        process.exit(1);
      }
      viewCommand(remainingArgs[0]);
      break;
    case 'log':
      logCommand(remainingArgs[0]);
      break;
    case 'commit':
      if (remainingArgs.length === 0) {
        console.error('Usage: minddiff commit <sha>');
        process.exit(1);
      }
      commitCommand(remainingArgs[0]);
      break;
    case 'memories':
      let tag: string | undefined;
      const tagIdx = remainingArgs.indexOf('--tag');
      const tIdx = remainingArgs.indexOf('-t');
      if (tagIdx !== -1 && tagIdx + 1 < remainingArgs.length) {
        tag = remainingArgs[tagIdx + 1];
      } else if (tIdx !== -1 && tIdx + 1 < remainingArgs.length) {
        tag = remainingArgs[tIdx + 1];
      }
      memoriesCommand(tag);
      break;
    case 'sync':
      if (!existsSync(getDbDirectory())) {
        console.error('MindDiff is not initialized in this directory. Please run "minddiff init" first.');
        process.exit(1);
      }
      if (isGitRepository()) {
        if (process.stdin.isTTY && hasUncommittedChanges()) {
          console.log('\n⚠️ Uncommitted changes detected.\n');
          console.log('MindDiff associates memories with Git commits.\n');
          console.log('If you sync now, your current work will be linked to your latest commit.\n');
          console.log('Commit your work first if you want these memories associated with a new commit.\n');
          
          const answer = await askQuestion('Proceed anyway? (Y/n) ');
          const choice = answer.trim().toLowerCase();
          if (choice !== '' && choice !== 'y' && choice !== 'yes') {
            console.log('Aborted.');
            process.exit(0);
          }
        }
        syncCommits();
        console.log('✓ MindDiff database synchronized with Git HEAD');
      } else {
        syncCommits();
        console.log('⚠ Not inside a Git repository. Active sessions cleaned.');
      }
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('MindDiff Error:', err);
  process.exit(1);
});
