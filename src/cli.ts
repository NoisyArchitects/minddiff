#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { geminiCommand } from './commands/gemini.js';
import { watchCommand } from './commands/watch.js';
import { initCommand } from './commands/init.js';
import { runCommand } from './commands/run.js';
import { syncCommits, isGitRepository } from './storage/git.js';
import { getDbDirectory } from './storage/db.js';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const remainingArgs = args.slice(1);

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
    case 'sync':
      if (!existsSync(getDbDirectory())) {
        console.error('MindDiff is not initialized in this directory. Please run "minddiff init" first.');
        process.exit(1);
      }
      if (isGitRepository()) {
        syncCommits();
        console.log('✓ MindDiff database synchronized with Git HEAD');
      } else {
        syncCommits();
        console.log('⚠ Not inside a Git repository. Active sessions cleaned.');
      }
      break;
    default:
      console.log('MindDiff V1');
      console.log('Usage:');
      console.log('  minddiff init              - Initialize MindDiff and configure Git hooks');
      console.log('  minddiff run <agent> [args]- Run any supported agent under MindDiff wrapping');
      console.log('  minddiff gemini [args...]  - Launch Gemini CLI with interception (legacy shortcut)');
      console.log('  minddiff sync              - Synchronize any pending commits with active sessions');
      console.log('  minddiff watch             - Tail the latest capture log');
      process.exit(1);
  }
}

main().catch((err) => {
  console.error('MindDiff Error:', err);
  process.exit(1);
});
