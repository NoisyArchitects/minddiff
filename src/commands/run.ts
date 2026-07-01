import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { getDbDirectory, createSession, addActiveSession, updateSessionRunningStatus, removeActiveSession } from '../storage/db.js';
import { createLogStream } from '../runtime/stream.js';
import { getAgent, agentPlugins, isCommandInstalled } from '../runtime/agent.js';
import { syncCommits, isGitRepository } from '../storage/git.js';
import { compileSession } from '../compiler/pipeline.js';
import { selectPrompt, askQuestion } from '../utils/prompt.js';
import { theme } from '../utils/theme.js';
import { initCommand } from './init.js';

export async function runCommand(agentName?: string, args: string[] = []): Promise<number> {
  // 1. Git Repository Check
  if (!isGitRepository()) {
    if (process.stdout.isTTY && process.stdin.isTTY) {
      console.log(theme.warning('\n⚠️ Git repository not found.'));
      console.log('MindDiff preserves your engineering memory and goals alongside your commit history.');
      console.log('Without Git, commit-linked features and automated memory sync will be disabled.\n');
      
      const choice = await selectPrompt(
        'How would you like to proceed?',
        ['Initialize Git', 'Continue without Git', 'Cancel']
      );
      
      if (choice === 0) {
        try {
          execSync('git init', { stdio: 'inherit' });
          console.log(theme.success('\n✓ Initialized empty Git repository.\n'));
        } catch (err: any) {
          console.error(theme.warning(`Failed to initialize Git: ${err.message}`));
          console.log('Continuing without Git...\n');
        }
      } else if (choice === 2) {
        console.log('Aborted.');
        return 0;
      } else {
        console.log(theme.dim('Continuing without Git...\n'));
      }
    } else {
      console.warn(theme.warning('Warning: MindDiff is running outside a Git repository. Commit syncing will be disabled.'));
    }
  }

  // 2. MindDiff Initialized Check
  const dbDir = getDbDirectory();
  if (!existsSync(dbDir)) {
    if (process.stdout.isTTY && process.stdin.isTTY) {
      console.log(theme.warning('\n⚠️ MindDiff is not initialized in this project.'));
      const choice = await selectPrompt(
        'Would you like to initialize MindDiff automatically now?',
        ['Initialize MindDiff', 'Cancel']
      );
      if (choice === 0) {
        console.log('');
        initCommand();
        console.log('');
      } else {
        console.log('Aborted.');
        return 0;
      }
    } else {
      console.error(theme.warning('Error: MindDiff is not initialized in this directory.\nPlease run "minddiff init" or run in an interactive terminal to initialize automatically.'));
      return 1;
    }
  }

  // Sync any previous commits before starting the new session
  syncCommits();

  // 3. Agent Picker (if agentName not specified)
  let selectedAgent = agentName;
  let selectedArgs = args;

  if (!selectedAgent) {
    if (process.stdout.isTTY && process.stdin.isTTY) {
      const options: string[] = [];
      const pluginMap: Record<number, any> = {};

      const installed = agentPlugins.filter(p => isCommandInstalled(p.command));
      const available = agentPlugins.filter(p => !isCommandInstalled(p.command));

      installed.forEach(p => {
        options.push(`✓ ${p.name}`);
        pluginMap[options.length - 1] = p;
      });

      available.forEach(p => {
        options.push(`○ ${p.name} (not installed)`);
        pluginMap[options.length - 1] = p;
      });

      options.push('Custom command...');

      const agentChoiceIdx = await selectPrompt('Select Agent to Run', options);
      if (agentChoiceIdx === options.length - 1) {
        // Custom command selection
        const customCmd = await askQuestion('Enter custom CLI command to run: ');
        if (!customCmd.trim()) {
          console.log('Aborted.');
          return 0;
        }
        // Parse custom command into agent name and arguments
        const parts = customCmd.trim().split(/\s+/);
        selectedAgent = parts[0];
        selectedArgs = parts.slice(1);
      } else {
        const selectedPlugin = pluginMap[agentChoiceIdx];
        // If selected agent is in the available (not installed) list, show instructions and ask again or cancel
        if (!isCommandInstalled(selectedPlugin.command)) {
          console.log(theme.warning(`\n⚠️  ${selectedPlugin.name} is not installed or not in your PATH.`));
          console.log(`Please install it first or choose a different agent.\n`);
          const retryChoice = await selectPrompt('What would you like to do?', [
            'Choose another agent',
            'Run anyway (experimental)',
            'Cancel'
          ]);
          if (retryChoice === 0) {
            return runCommand(undefined, args); // recurse picker
          } else if (retryChoice === 2) {
            console.log('Aborted.');
            return 0;
          }
        }
        selectedAgent = selectedPlugin.id;
      }
    } else {
      // Non-interactive fallback:
      console.log(theme.bold('\nMindDiff Session Capture'));
      console.log(theme.dim('==================================='));
      console.log('Capture an AI coding session by wrapping it under a pseudo-terminal.');
      console.log('\nUsage:');
      console.log('  minddiff run <agent> [args...]');
      console.log('\nExamples:');
      console.log('  minddiff run claude');
      console.log('  minddiff run gemini');
      console.log('  minddiff run npm test');
      console.log(`\n${theme.highlight('Tip:')} Run 'minddiff' or 'minddiff run' without arguments in an interactive terminal to choose an agent.`);
      return 0;
    }
  }

  if (!selectedAgent) {
    return 0;
  }

  // Create session files
  const { sessionId, logPath } = createSession(selectedAgent, selectedArgs);

  // Set the session as active and running in state.json
  addActiveSession(sessionId, process.pid);

  const logStream = createLogStream(logPath);
  
  console.log(`\n${theme.bold(theme.accent('-- MindDiff: Starting ' + selectedAgent + ' --'))}`);
  console.log(`${theme.dim('(logging raw session outputs to ' + logPath + ')')}\n`);

  try {
    const agent = getAgent(selectedAgent);
    const exitCode = await agent.execute(selectedArgs, logStream);

    // Toggle running status to false upon exit
    updateSessionRunningStatus(sessionId, false);

    // Compile session logs into memory.json
    try {
      await compileSession(sessionId);
    } catch (compileErr: any) {
      console.error(theme.warning(`MindDiff Memory Compilation Failed: ${compileErr.message}`));
    }

    // Sync any commits made during the session immediately
    syncCommits();

    if (!isGitRepository()) {
      removeActiveSession(sessionId);
    }

    return exitCode;
  } catch (err: any) {
    console.error(theme.warning(`MindDiff Error while running agent ${selectedAgent}:`), err.message);
    updateSessionRunningStatus(sessionId, false);

    // Attempt memory compilation even on failure to preserve raw.log history
    try {
      await compileSession(sessionId);
    } catch (compileErr: any) {
      console.error(theme.warning(`MindDiff Memory Compilation Failed: ${compileErr.message}`));
    }

    if (!isGitRepository()) {
      removeActiveSession(sessionId);
    }
    return 1;
  }
}
