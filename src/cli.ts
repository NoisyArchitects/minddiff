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
import { theme } from './utils/theme.js';

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(theme.bold(theme.highlight(query)), (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

export function printCompactHelp() {
  console.log(`
  ${theme.bold(theme.accent('MindDiff'))} - Preserving engineering memory.

  ${theme.bold('Usage')}
    $ minddiff <command>

  ${theme.bold('Capture')}
    ${theme.highlight('run')}         Capture a CLI session under an agent wrapper
    ${theme.highlight('status')}      Show active capturing sessions
    ${theme.highlight('watch')}       Watch the active capturing session
    ${theme.highlight('init')}        Initialize MindDiff in a new directory (manual)

  ${theme.bold('Explore')}
    ${theme.highlight('history')}     Browse previous developer sessions
    ${theme.highlight('view')}        View a recorded session's narrative story
    ${theme.highlight('log')}         View a session's reconstructed clean transcript
    ${theme.highlight('memories')}    Browse preserved developer memories
    ${theme.highlight('commit')}      Explain why a Git commit happened

  ${theme.bold('Sync')}
    ${theme.highlight('sync')}        Synchronize commits with Git

    ${theme.highlight('help')}        Show detailed help manual
  `);
}

const COMMAND_DOCS: Record<string, string> = {
  init: `
  ${theme.bold(theme.accent('minddiff init'))}

  ${theme.bold('Purpose')}
    Initialize the MindDiff environment manually in the current workspace.

  ${theme.bold('Usage')}
    $ minddiff init

  ${theme.bold('What Happens Next')}
    MindDiff creates the .minddiff/ database structure and installs post-commit
    hooks in your .git/ directory. Future commits will be automatically indexed.

  ${theme.bold('Related Commands')}
    run, sync
  `,
  run: `
  ${theme.bold(theme.accent('minddiff run [agent] [args...]'))}

  ${theme.bold('Purpose')}
    Launch an AI agent or direct terminal command wrapper under capture.

  ${theme.bold('Usage')}
    $ minddiff run claude
    $ minddiff run gemini
    $ minddiff run                (Opens interactive agent picker)

  ${theme.bold('What Happens Next')}
    MindDiff launches the target command inside a pseudo-terminal wrapper,
    captures all standard inputs/outputs, detects intents/thoughts, and compiles
    the log when the process exits.

  ${theme.bold('Related Commands')}
    status, watch, history
  `,
  status: `
  ${theme.bold(theme.accent('minddiff status'))}

  ${theme.bold('Purpose')}
    Inspect currently running capturing sessions and view a summary of recent sessions.

  ${theme.bold('Usage')}
    $ minddiff status

  ${theme.bold('Related Commands')}
    watch, history
  `,
  watch: `
  ${theme.bold(theme.accent('minddiff watch'))}

  ${theme.bold('Purpose')}
    Tail the stdout stream of the currently active capturing session.

  ${theme.bold('Usage')}
    $ minddiff watch

  ${theme.bold('Related Commands')}
    status, log
  `,
  history: `
  ${theme.bold(theme.accent('minddiff history'))}

  ${theme.bold('Purpose')}
    List a tabular log of all previously recorded developer sessions.

  ${theme.bold('Usage')}
    $ minddiff history

  ${theme.bold('Related Commands')}
    view, log, commit
  `,
  view: `
  ${theme.bold(theme.accent('minddiff view [session-id] [--raw] [--json]'))}

  ${theme.bold('Purpose')}
    Display the semantic goal episodes projected from a session log.

  ${theme.bold('Usage')}
    $ minddiff view               (Opens interactive session picker)
    $ minddiff view session-1234
    $ minddiff view session-1234 --raw

  ${theme.bold('Options')}
    --raw      Print flat, chronological memory blocks
    --json     Output raw compiled database JSON structure

  ${theme.bold('Related Commands')}
    history, log
  `,
  log: `
  ${theme.bold(theme.accent('minddiff log [session-id]'))}

  ${theme.bold('Purpose')}
    Print the reconstructed, cleaned text transcript of a session.

  ${theme.bold('Usage')}
    $ minddiff log                (Opens interactive session picker)
    $ minddiff log session-1234

  ${theme.bold('What Happens Next')}
    Filters terminal control sequences and ANSI backspaces on the fly.

  ${theme.bold('Related Commands')}
    view, history
  `,
  memories: `
  ${theme.bold(theme.accent('minddiff memories [--tag <tag>]'))}

  ${theme.bold('Purpose')}
    Browse a consolidated timeline of all developer memories and inferred tags.

  ${theme.bold('Usage')}
    $ minddiff memories
    $ minddiff memories --tag debugging

  ${theme.bold('Related Commands')}
    history, commit
  `,
  commit: `
  ${theme.bold(theme.accent('minddiff commit [sha]'))}

  ${theme.bold('Purpose')}
    Explain why a Git commit happened by linking it to captured developer sessions.

  ${theme.bold('Usage')}
    $ minddiff commit             (Opens interactive commit picker)
    $ minddiff commit a1b2c3d

  ${theme.bold('Related Commands')}
    history, memories
  `,
  sync: `
  ${theme.bold(theme.accent('minddiff sync'))}

  ${theme.bold('Purpose')}
    Manually synchronize Git commits with active capturing sessions.

  ${theme.bold('Usage')}
    $ minddiff sync

  ${theme.bold('Related Commands')}
    init, status
  `
};

export function printDetailedHelp(subcommand?: string) {
  if (subcommand && COMMAND_DOCS[subcommand]) {
    console.log(COMMAND_DOCS[subcommand]);
    return;
  }

  console.log(`
  ${theme.bold(theme.accent('MindDiff Manual'))}

  MindDiff operates in two primary workflows:

  1. ${theme.bold('Interactive Launcher')} (Recommended)
     Simply run:
       $ ${theme.highlight('minddiff')}
     Browse commands, tutorials, and help using keyboard arrow keys.

  2. ${theme.bold('Direct CLI')}
     Run commands directly for scripting or fast access:
       $ ${theme.highlight('minddiff history')}
       $ ${theme.highlight('minddiff view')}
       $ ${theme.highlight('minddiff commit')}

  ==============================================================================
  COMMAND REFERENCE
  ==============================================================================
    ${theme.highlight('init')}          Initialize MindDiff manually in workspace
    ${theme.highlight('run')}           Capture a CLI session under an agent wrapper
    ${theme.highlight('status')}        Show active capturing sessions
    ${theme.highlight('watch')}         Tail the live log stream of the active session
    ${theme.highlight('history')}       Browse previous developer sessions
    ${theme.highlight('view')}          View a recorded session's narrative story
    ${theme.highlight('log')}           View a session's reconstructed clean transcript
    ${theme.highlight('memories')}      Browse all preserved developer memories
    ${theme.highlight('commit')}        Explain why a Git commit happened
    ${theme.highlight('sync')}          Synchronize commits with Git

  ==============================================================================
  ADDITIONAL HELP
  ==============================================================================
    To view help for a specific command, run:
       $ ${theme.highlight('minddiff help <command-name>')}
  `);
}

export async function executeCommand(command: string, remainingArgs: string[]): Promise<void> {
  switch (command) {
    case 'init':
      initCommand();
      break;
    case 'run':
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
      const viewSessionId = remainingArgs[0];
      const isRaw = remainingArgs.includes('--raw');
      const isJson = remainingArgs.includes('--json');
      await viewCommand(viewSessionId, { raw: isRaw, json: isJson });
      break;
    case 'log':
      await logCommand(remainingArgs[0]);
      break;
    case 'commit':
      await commitCommand(remainingArgs[0]);
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
        console.error(theme.warning('MindDiff is not initialized in this directory. Please run "minddiff init" first.'));
        process.exit(1);
      }
      if (isGitRepository()) {
        if (process.stdin.isTTY && hasUncommittedChanges()) {
          console.log(`\n${theme.warning('⚠️ Uncommitted changes detected.')}\n`);
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
        console.log(theme.success('✓ MindDiff database synchronized with Git HEAD'));
      } else {
        syncCommits();
        console.log(theme.warning('⚠ Not inside a Git repository. Active sessions cleaned.'));
      }
      break;
    default:
      console.error(theme.warning(`Unknown command: ${command}`));
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
  console.error(theme.warning('MindDiff Error:'), err);
  process.exit(1);
});
