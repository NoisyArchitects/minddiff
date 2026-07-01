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
import { homeCommand } from './commands/home.js';

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

export function printCompactHelp() {
  console.log(`
  \x1b[1mMindDiff\x1b[0m

  \x1b[1mUsage\x1b[0m
    minddiff <command>

  \x1b[1mCapture\x1b[0m
    \x1b[36minit\x1b[0m        \x1b[2mInitialize MindDiff\x1b[0m
    \x1b[36mrun\x1b[0m         \x1b[2mCapture a CLI session\x1b[0m
    \x1b[36mstatus\x1b[0m      \x1b[2mShow active sessions\x1b[0m
    \x1b[36mwatch\x1b[0m       \x1b[2mWatch the active session\x1b[0m

  \x1b[1mExplore\x1b[0m
    \x1b[36mhistory\x1b[0m     \x1b[2mBrowse previous sessions\x1b[0m
    \x1b[36mview\x1b[0m        \x1b[2mView a recorded session\x1b[0m
    \x1b[36mlog\x1b[0m         \x1b[2mView cleaned transcript\x1b[0m
    \x1b[36mmemories\x1b[0m    \x1b[2mBrowse preserved memories\x1b[0m
    \x1b[36mcommit\x1b[0m      \x1b[2mExplain why a Git commit happened\x1b[0m

  \x1b[1mSync\x1b[0m
    \x1b[36msync\x1b[0m        \x1b[2mSynchronize sessions with Git\x1b[0m

    \x1b[36mhelp\x1b[0m        \x1b[2mShow detailed help\x1b[0m
`);
}

const COMMAND_DOCS: Record<string, string> = {
  init: `
  \x1b[1mminddiff init\x1b[0m

  Initialize MindDiff in the current project root.
  Creates the database structure in .minddiff/ and registers standard Git commit hooks.
`,
  run: `
  \x1b[1mminddiff run <agent> [args...]\x1b[0m

  Launches an agent or CLI command inside a captured pseudo-terminal.
  MindDiff records raw terminal outputs, command status, and agent thoughts.

  Examples:
    $ minddiff run gemini
    $ minddiff run npm test
`,
  status: `
  \x1b[1mminddiff status\x1b[0m

  Shows active capturing sessions, process IDs, and a summary of recent sessions.
`,
  watch: `
  \x1b[1mminddiff watch\x1b[0m

  Tails the live stdout log stream of the currently active capturing session.
`,
  history: `
  \x1b[1mminddiff history\x1b[0m

  Lists all previous developer sessions recorded in the workspace in reverse chronological order.
`,
  view: `
  \x1b[1mminddiff view <session-id> [--raw] [--json]\x1b[0m

  Views details of a compiled developer session.
  
  Options:
    (default)   Narrative Story layout grouping steps into goal episodes
    --raw       Dumps the flat, chronological MemoryBlock records with terminal outputs
    --json      Dumps raw database JSON representation
`,
  log: `
  \x1b[1mminddiff log <session-id>\x1b[0m

  Prints the reconstructed, fully-cleaned, raw text log of a session.
  All carriage returns, backspaces, and ANSI styling are resolved.
`,
  memories: `
  \x1b[1mminddiff memories [--tag <tag-name>]\x1b[0m

  Browses a consolidated timeline of all compiled developer facts and tags.
  Use --tag or -t to filter by categories like 'debugging' or 'code_edit'.
`,
  commit: `
  \x1b[1mminddiff commit <commit-sha>\x1b[0m

  Explains why a Git commit happened by inspecting the developer sessions
  active at the time of the commit, detailing goals, outputs, and linter errors.
`,
  sync: `
  \x1b[1mminddiff sync\x1b[0m

  Manually scans the Git logs and synchronizes Git commits with active
  MindDiff sessions, updating registers on Git HEAD updates.
`
};

export function printDetailedHelp(subcommand?: string) {
  if (subcommand && COMMAND_DOCS[subcommand]) {
    console.log(COMMAND_DOCS[subcommand]);
    return;
  }

  console.log(`
  \x1b[1mMindDiff\x1b[0m

  MindDiff operates in two workflows:

  1. \x1b[1mInteractive Launcher\x1b[0m (Recommended)
     Simply run:
       $ minddiff
     Browse commands, tutorials, and help using keyboard navigation.

  2. \x1b[1mDirect CLI\x1b[0m
     Run commands directly for scripting or fast access:
       $ minddiff history
       $ minddiff view <session-id>
       $ minddiff commit <sha>

  ==============================================================================
  COMMAND REFERENCE
  ==============================================================================
    \x1b[36minit\x1b[0m          Initialize MindDiff and configure Git hooks
    \x1b[36mrun\x1b[0m           Capture a CLI session under an agent wrapper
    \x1b[36mstatus\x1b[0m        Show active capturing sessions
    \x1b[36mwatch\x1b[0m         Tail the live log stream of the active session
    \x1b[36mhistory\x1b[0m       Browse previous developer sessions
    \x1b[36mview\x1b[0m          View a recorded session's narrative story
    \x1b[36mlog\x1b[0m           View a session's reconstructed clean transcript
    \x1b[36mmemories\x1b[0m      Browse all preserved developer memories
    \x1b[36mcommit\x1b[0m        Explain why a Git commit happened
    \x1b[36msync\x1b[0m          Synchronize commits with Git

  ==============================================================================
  ADDITIONAL HELP
  ==============================================================================
    To view help for a specific command, run:
       $ minddiff help <command>
`);
}

export async function executeCommand(command: string, remainingArgs: string[]): Promise<void> {
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
        console.error('Usage: minddiff view <session-id> [--raw] [--json]');
        process.exit(1);
      }
      const viewSessionId = remainingArgs[0];
      const isRaw = remainingArgs.includes('--raw');
      const isJson = remainingArgs.includes('--json');
      viewCommand(viewSessionId, { raw: isRaw, json: isJson });
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
      printCompactHelp();
      process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const remainingArgs = args.slice(1);

  if (!command) {
    if (process.stdout.isTTY && process.stdin.isTTY) {
      await homeCommand();
      process.exit(0);
    } else {
      printCompactHelp();
      process.exit(0);
    }
  }

  if (command === 'help' || command === '--help' || command === '-h') {
    const subcommand = remainingArgs[0];
    printDetailedHelp(subcommand);
    process.exit(0);
  }

  await executeCommand(command, remainingArgs);
}

main().catch((err) => {
  console.error('MindDiff Error:', err);
  process.exit(1);
});
