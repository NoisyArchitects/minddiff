import { WriteStream } from 'node:fs';
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

// Registry of supported agents
export const agentRegistry: Record<string, Agent> = {
  gemini: new PTYAgent('gemini', 'gemini'),
  claude: new PTYAgent('claude', 'claude'),
  aider: new PTYAgent('aider', 'aider'),
  copilot: new PTYAgent('copilot', 'copilot')
};

// Retrieve an agent or construct a dynamic one for arbitrary command wrapping
export function getAgent(name: string): Agent {
  if (agentRegistry[name]) {
    return agentRegistry[name];
  }
  // Allow wrapping of arbitrary commands not in registry
  return new PTYAgent(name, name);
}
