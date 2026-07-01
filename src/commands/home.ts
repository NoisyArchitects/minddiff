import * as readline from 'node:readline';
import { executeCommand } from '../cli.js';
import { getAllSessions, SessionMetadata } from '../storage/db.js';
import { agentPlugins, isCommandInstalled } from '../runtime/agent.js';
import { theme } from '../utils/theme.js';

interface DashboardState {
  activeTab: 'commands' | 'tutorials' | 'help' | 'about';
  cursorY: number;
  promptState: 'none' | 'select_agent' | 'select_session' | 'input_sha' | 'input_tag' | 'input_custom_agent';
  agentCursor: number;
  sessionCursor: number;
  inputText: string;
  sessions: SessionMetadata[];
  targetCommand: string; // 'view' or 'log' or 'memories' or 'run' or 'commit'
}

const state: DashboardState = {
  activeTab: 'commands',
  cursorY: 0,
  promptState: 'none',
  agentCursor: 0,
  sessionCursor: 0,
  inputText: '',
  sessions: [],
  targetCommand: ''
};

const TABS: ('commands' | 'tutorials' | 'help' | 'about')[] = [
  'commands',
  'tutorials',
  'help',
  'about'
];

const COMMAND_LIST = [
  { name: 'init', desc: 'Initialize MindDiff' },
  { name: 'run', desc: 'Capture a CLI session' },
  { name: 'status', desc: 'Show active sessions' },
  { name: 'watch', desc: 'Watch the active session' },
  { name: 'history', desc: 'Browse previous sessions' },
  { name: 'view', desc: 'View a recorded session' },
  { name: 'log', desc: 'View cleaned transcript' },
  { name: 'memories', desc: 'Browse preserved memories' },
  { name: 'commit', desc: 'Explain why a Git commit happened' },
  { name: 'sync', desc: 'Synchronize sessions with Git' }
];

function getAgentOptions() {
  const options: { label: string; id: string; command: string; isInstalled: boolean }[] = [];
  const installed = agentPlugins.filter(p => isCommandInstalled(p.command));
  const available = agentPlugins.filter(p => !isCommandInstalled(p.command));

  installed.forEach(p => {
    options.push({ label: `✓ ${p.name}`, id: p.id, command: p.command, isInstalled: true });
  });

  available.forEach(p => {
    options.push({ label: `○ ${p.name} (not installed)`, id: p.id, command: p.command, isInstalled: false });
  });

  options.push({ label: '[custom command]', id: 'custom', command: '', isInstalled: true });
  return options;
}

function cleanAndExit(command?: string, args?: string[]) {
  // Clear screen
  process.stdout.write('\u001b[H\u001b[J');
  
  // Restore normal stdin mode
  process.stdin.setRawMode(false);
  process.stdin.pause();

  if (command) {
    executeCommand(command, args || []).catch((err) => {
      console.error(theme.warning(`MindDiff execution failed: ${err.message}`));
      process.exit(1);
    });
  } else {
    process.exit(0);
  }
}

function render() {
  let output = '';
  output += `\n  ${theme.bold(theme.accent('MindDiff'))}\n\n`;

  // Render Tabs
  const tabHeaders = TABS.map(tab => {
    const isSelected = tab === state.activeTab;
    const displayName = tab.charAt(0).toUpperCase() + tab.slice(1);
    return isSelected ? theme.bold(theme.highlight(`[ ${displayName} ]`)) : `  ${displayName}  `;
  }).join(' ');
  
  output += `  ${tabHeaders}\n`;
  output += '  ' + theme.dim('─'.repeat(56)) + '\n\n';

  // Render Content
  if (state.activeTab === 'commands') {
    if (state.promptState === 'none') {
      output += `  ${theme.bold('Commands')}\n\n`;
      COMMAND_LIST.forEach((cmd, idx) => {
        const isSelected = idx === state.cursorY;
        const pointer = isSelected ? theme.highlight(' ➔ ') : '   ';
        const cmdStr = isSelected ? theme.bold(theme.accent(cmd.name.padEnd(10))) : cmd.name.padEnd(10);
        const descStr = isSelected ? theme.bold(cmd.desc) : theme.dim(cmd.desc);
        output += `${pointer} ${cmdStr}  ${descStr}\n`;
      });
    } else if (state.promptState === 'select_agent') {
      output += `  ${theme.bold('Select Agent to Run')}\n\n`;
      const agentOptions = getAgentOptions();
      agentOptions.forEach((opt, idx) => {
        const isSelected = idx === state.agentCursor;
        const pointer = isSelected ? theme.highlight(' ➔ ') : '   ';
        let labelText = opt.label;
        if (opt.id !== 'custom') {
          if (opt.isInstalled) {
            labelText = isSelected ? theme.bold(theme.accent(opt.label)) : opt.label;
          } else {
            labelText = isSelected ? theme.bold(theme.accent(opt.label)) : theme.dim(opt.label);
          }
        } else {
          labelText = isSelected ? theme.bold(theme.accent(opt.label)) : opt.label;
        }
        output += `${pointer} ${labelText}\n`;
      });
    } else if (state.promptState === 'select_session') {
      output += `  ${theme.bold(`Select Session to ${state.targetCommand === 'view' ? 'View' : 'Log'}`)}\n\n`;
      if (state.sessions.length === 0) {
        output += `   ${theme.dim('No sessions found on disk.')}\n`;
      } else {
        state.sessions.forEach((sess, idx) => {
          const isSelected = idx === state.sessionCursor;
          const pointer = isSelected ? theme.highlight(' ➔ ') : '   ';
          const dateStr = new Date(sess.createdAt).toLocaleDateString();
          const info = `${sess.id.padEnd(40)} (Agent: ${sess.agent}) - ${dateStr}`;
          output += `${pointer} ${isSelected ? theme.bold(theme.accent(info)) : theme.dim(info)}\n`;
        });
      }
    } else if (state.promptState === 'input_sha') {
      output += `  ${theme.bold('Explain Commit')}\n\n`;
      output += `   Enter Git Commit SHA: ${theme.highlight(state.inputText)}${theme.bold('_')}\n`;
    } else if (state.promptState === 'input_tag') {
      output += `  ${theme.bold('Filter Memories by Tag')}\n\n`;
      output += `   Enter tag name (optional, press Enter for all): ${theme.highlight(state.inputText)}${theme.bold('_')}\n`;
    } else if (state.promptState === 'input_custom_agent') {
      output += `  ${theme.bold('Custom CLI Command')}\n\n`;
      output += `   Enter command to run under capture: ${theme.highlight(state.inputText)}${theme.bold('_')}\n`;
    }
  } else if (state.activeTab === 'tutorials') {
    output += `  ${theme.bold('Getting Started with MindDiff')}\n\n`;
    output += `  ${theme.bold('1. Start Capturing Work')}\n`;
    output += `     Run \`${theme.highlight('minddiff run gemini')}\` (or another agent/tool).\n`;
    output += '     MindDiff wraps the PTY to record terminal execution and intents.\n\n';
    output += `  ${theme.bold('2. Save Code Changes')}\n`;
    output += `     Use standard git workflow (\`git add\` and \`git commit\`).\n`;
    output += '     The post-commit hook automatically links commits to your session.\n\n';
    output += `  ${theme.bold('3. Explain Commits')}\n`;
    output += `     Run \`${theme.highlight('minddiff commit <sha>')}\` to view the cognitive context,\n`;
    output += '     goals, and debugging thoughts that produced that commit.\n';
  } else if (state.activeTab === 'help') {
    output += `  ${theme.bold('MindDiff Documentation & Help')}\n\n`;
    output += `  ${theme.bold('Direct CLI Syntax Cheat Sheet:')}\n`;
    output += `    $ ${theme.highlight('minddiff run <agent>')}      Capture a new session\n`;
    output += `    $ ${theme.highlight('minddiff view <session>')}   View a session's narrative story\n`;
    output += `    $ ${theme.highlight('minddiff commit <sha>')}     Explain why a Git commit happened\n`;
    output += `    $ ${theme.highlight('minddiff history')}          List previous sessions\n`;
    output += `    $ ${theme.highlight('minddiff memories')}         Browse tag filter timelines\n\n`;
    output += `  ${theme.bold('Command Manuals:')}\n`;
    output += '    To inspect a detailed reference of any command directly,\n';
    output += '    exit this launcher and execute:\n';
    output += `      ${theme.highlight('$ minddiff help <command-name>')}\n`;
  } else if (state.activeTab === 'about') {
    output += `  ${theme.bold('MindDiff')}\n\n`;
    output += '  Preserving developer continuity alongside repository evolution.\n';
    output += '  MindDiff models thoughts, tool calls, and actions as Semantic Episodes\n';
    output += '  to explain the "Why" behind code commits.\n\n';
    output += `  ${theme.dim('Version:      1.1.1')}\n`;
    output += `  ${theme.dim('License:      MIT')}\n`;
  }

  output += '\n  ' + theme.dim('─'.repeat(56)) + '\n';
  if (state.promptState !== 'none') {
    output += `  ${theme.dim('Enter Select / Submit  ·  Esc Cancel / Go Back')}\n`;
  } else {
    output += `  ${theme.dim('↑↓ Navigate  ·  ←→ Switch Tabs  ·  Enter Select  ·  Esc Exit')}\n`;
  }

  process.stdout.write('\u001b[H\u001b[J' + output);
}

function handleInput(key: any) {
  // 1. Prompt State Input Handling (Typing)
  const isTextInputState = 
    state.promptState === 'input_sha' || 
    state.promptState === 'input_tag' || 
    state.promptState === 'input_custom_agent';

  if (isTextInputState) {
    if (key.name === 'escape') {
      state.promptState = 'none';
      state.inputText = '';
      render();
      return;
    }

    if (key.name === 'return' || key.name === 'enter') {
      const text = state.inputText.trim();
      state.promptState = 'none';
      state.inputText = '';

      if (state.targetCommand === 'commit') {
        cleanAndExit('commit', text ? [text] : []);
      } else if (state.targetCommand === 'memories') {
        cleanAndExit('memories', text ? ['--tag', text] : []);
      } else if (state.targetCommand === 'run') {
        cleanAndExit('run', text ? [text] : []);
      }
      return;
    }

    if (key.name === 'backspace') {
      state.inputText = state.inputText.slice(0, -1);
      render();
      return;
    }

    // Capture printable chars
    if (key.sequence && key.sequence.length === 1) {
      state.inputText += key.sequence;
      render();
      return;
    }
  }

  // 2. Select Prompts Keypress Handling
  if (state.promptState === 'select_agent') {
    const agentOptions = getAgentOptions();
    if (key.name === 'escape') {
      state.promptState = 'none';
      render();
      return;
    }
    if (key.name === 'up') {
      state.agentCursor = Math.max(0, state.agentCursor - 1);
      render();
      return;
    }
    if (key.name === 'down') {
      state.agentCursor = Math.min(agentOptions.length - 1, state.agentCursor + 1);
      render();
      return;
    }
    if (key.name === 'return' || key.name === 'enter') {
      const choice = agentOptions[state.agentCursor];
      if (choice.id === 'custom') {
        state.promptState = 'input_custom_agent';
        state.inputText = '';
      } else {
        cleanAndExit('run', [choice.id]);
      }
      return;
    }
  }

  if (state.promptState === 'select_session') {
    if (key.name === 'escape') {
      state.promptState = 'none';
      render();
      return;
    }
    if (key.name === 'up') {
      state.sessionCursor = Math.max(0, state.sessionCursor - 1);
      render();
      return;
    }
    if (key.name === 'down') {
      state.sessionCursor = Math.min(state.sessions.length - 1, state.sessionCursor + 1);
      render();
      return;
    }
    if (key.name === 'return' || key.name === 'enter') {
      if (state.sessions.length > 0) {
        const sess = state.sessions[state.sessionCursor];
        cleanAndExit(state.targetCommand, [sess.id]);
      } else {
        state.promptState = 'none';
        render();
      }
      return;
    }
  }

  // 3. Main Dashboard Navigation
  if (key.name === 'escape') {
    cleanAndExit();
    return;
  }

  if (key.name === 'left') {
    const idx = TABS.indexOf(state.activeTab);
    const newIdx = idx === 0 ? TABS.length - 1 : idx - 1;
    state.activeTab = TABS[newIdx];
    state.cursorY = 0;
    render();
    return;
  }

  if (key.name === 'right') {
    const idx = TABS.indexOf(state.activeTab);
    const newIdx = idx === TABS.length - 1 ? 0 : idx + 1;
    state.activeTab = TABS[newIdx];
    state.cursorY = 0;
    render();
    return;
  }

  if (state.activeTab === 'commands') {
    if (key.name === 'up') {
      state.cursorY = Math.max(0, state.cursorY - 1);
      render();
      return;
    }
    if (key.name === 'down') {
      state.cursorY = Math.min(COMMAND_LIST.length - 1, state.cursorY + 1);
      render();
      return;
    }
    if (key.name === 'return' || key.name === 'enter') {
      const selected = COMMAND_LIST[state.cursorY].name;
      
      // Determine if prompting is required
      if (selected === 'run') {
        state.promptState = 'select_agent';
        state.agentCursor = 0;
        state.targetCommand = 'run';
        render();
      } else if (selected === 'view' || selected === 'log') {
        state.promptState = 'select_session';
        state.sessionCursor = 0;
        state.sessions = getAllSessions().slice(0, 10); // Fetch last 10 sessions
        state.targetCommand = selected;
        render();
      } else if (selected === 'commit') {
        state.promptState = 'input_sha';
        state.inputText = '';
        state.targetCommand = 'commit';
        render();
      } else if (selected === 'memories') {
        state.promptState = 'input_tag';
        state.inputText = '';
        state.targetCommand = 'memories';
        render();
      } else {
        // Direct execution commands
        cleanAndExit(selected, []);
      }
      return;
    }
  }
}

export function homeCommand(): Promise<void> {
  return new Promise((resolve) => {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(true);
    }

    const onKeypress = (str: string, key: any) => {
      if (key.ctrl && key.name === 'c') {
        // Clear screen and exit cleanly
        process.stdout.write('\u001b[H\u001b[J');
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.exit(0);
      }
      handleInput(key);
    };

    process.stdin.on('keypress', onKeypress);
    
    // Initial draw
    render();
  });
}
