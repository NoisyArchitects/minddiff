import { WriteStream } from 'node:fs';
import { execSync } from 'node:child_process';
import { spawnWrapper } from './spawn.js';

export interface Agent {
  name: string;
  command: string;
  execute(args: string[], logStream: WriteStream): Promise<number>;
}

export class PTYAgent implements Agent {
  constructor(public name: string, public command: string) {}

  async execute(args: string[], logStream: WriteStream): Promise<number> {
    return spawnWrapper(this.command, args, logStream);
  }
}

export interface AgentPlugin {
  id: string;
  name: string;
  command: string;
}

// Registry of supported agent plugins
export const agentPlugins: AgentPlugin[] = [
  { id: 'claude', name: 'Claude Code', command: 'claude' },
  { id: 'gemini', name: 'Gemini CLI', command: 'gemini' },
  { id: 'aider', name: 'Aider', command: 'aider' },
  { id: 'copilot', name: 'Copilot CLI', command: 'copilot' },
  { id: 'agy', name: 'Antigravity', command: 'agy' },
  { id: 'codex', name: 'OpenAI Codex', command: 'codex' }
];

export function isCommandInstalled(command: string): boolean {
  try {
    // command -v is more portable across macOS and Linux shells than which
    const result = execSync(`command -v ${command}`, { stdio: 'pipe' }).toString().trim();
    return result.length > 0;
  } catch {
    return false;
  }
}

// Retrieve an agent or construct a dynamic one for arbitrary command wrapping
export function getAgent(name: string): Agent {
  const plugin = agentPlugins.find(p => p.id === name || p.command === name);
  const command = plugin ? plugin.command : name;
  return new PTYAgent(name, command);
}
