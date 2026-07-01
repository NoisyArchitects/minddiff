import { writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getDbDirectory } from '../storage/db.js';
import { MemoryBlock, MemoryLedger } from './types.js';

export interface EpisodeAction {
  type: string;
  target: string;
  exitCode?: number;
  durationMs?: number;
}

export interface SemanticEpisode {
  id: string;
  timestamp: string;
  goal: string;
  actions: EpisodeAction[];
  outcome: {
    status: 'success' | 'failure' | 'in_progress';
    summary: string;
  };
  reflection?: string;
  filesTouched: string[];
}

export interface HandoffData {
  sessionId: string;
  agent: string;
  lastGoal: string;
  accomplished: string[];
  unfinished: string[];
  blockers: string[];
  activeFiles: string[];
}

/**
 * Projects a raw list of MemoryBlocks into a structured list of Semantic Episodes.
 */
export function buildEpisodes(memories: MemoryBlock[]): SemanticEpisode[] {
  const episodes: SemanticEpisode[] = [];
  let currentEpisode: SemanticEpisode | null = null;

  for (const block of memories) {
    // A new episode starts on session initialization, an explicit user prompt (thought/input),
    // or when the agent enters a planning phase. Shell commands run by the user are actions, not new goals.
    const isNewIntent =
      block.observed.type === 'session_start' ||
      (block.source === 'user' && block.observed.type !== 'command_execution') ||
      block.inferred.tags.some(t => t.name === 'planning');

    if (isNewIntent || !currentEpisode) {
      if (currentEpisode) {
        episodes.push(currentEpisode);
      }
      currentEpisode = {
        id: `ep-${block.id.split('-')[1] || block.id}`,
        timestamp: block.timestamp,
        goal: block.inferred.intent || 'Execute tasks',
        actions: [],
        outcome: {
          status: 'in_progress',
          summary: ''
        },
        filesTouched: []
      };
    }

    // 1. Accumulate Actions
    if (block.observed.command) {
      currentEpisode.actions.push({
        type: 'command',
        target: block.observed.command,
        exitCode: block.observed.exitCode
      });
      extractFiles(block.observed.command, currentEpisode.filesTouched);
    } else if (block.observed.type === 'tool_call') {
      currentEpisode.actions.push({
        type: 'tool_call',
        target: block.observed.summary || 'Execute tool'
      });
      extractFiles(block.text, currentEpisode.filesTouched);
    }

    // 2. Accumulate Errors & Constraints
    if (block.observed.type === 'error_observation' && block.inferred.constraints) {
      currentEpisode.outcome.status = 'failure';
      currentEpisode.outcome.summary = block.inferred.constraints[0] || 'Compiler/Test execution failed';
    }

    // 3. Accumulate Reflections (agent thoughts following executions)
    if (block.source === 'agent' && block.observed.type === 'thought') {
      if (!block.inferred.tags.some(t => t.name === 'planning')) {
        currentEpisode.reflection = block.text;
      }
    }

    // 4. Update Outcome on successful validations
    const hasValidationTag = block.inferred.tags.some(t => t.name === 'validation');
    const isSuccessCommand = block.observed.type === 'command_execution' && block.observed.exitCode === 0;
    if (hasValidationTag || isSuccessCommand) {
      if (currentEpisode.outcome.status !== 'failure') {
        currentEpisode.outcome.status = 'success';
        currentEpisode.outcome.summary = 'Validation passed successfully';
      }
    }
  }

  if (currentEpisode) {
    episodes.push(currentEpisode);
  }

  return episodes;
}

/**
 * Extracts unique filenames from text/commands using standard file path extensions.
 */
function extractFiles(text: string, filesTouched: string[]) {
  const fileRegex = /(?:src|tests|docs|scripts)\/[\w\/\.-]+\.(?:ts|js|json|md|py|sh)/g;
  const matches = text.match(fileRegex);
  if (matches) {
    for (const match of matches) {
      const cleanPath = match.replace(/['"`]/g, '').trim();
      if (!filesTouched.includes(cleanPath)) {
        filesTouched.push(cleanPath);
      }
    }
  }
}

/**
 * Compiles handoff metadata and writes structured and human-readable handoff assets.
 */
export function generateHandoff(sessionId: string, memories: MemoryBlock[]): void {
  const dbDir = getDbDirectory();
  const metadataPath = join(dbDir, 'sessions', `${sessionId}.json`);
  const handoffJsonPath = join(dbDir, 'sessions', `${sessionId}.handoff.json`);
  const handoffMdPath = join(dbDir, 'sessions', `${sessionId}.handoff.md`);

  let agentName = 'unknown';
  if (existsSync(metadataPath)) {
    try {
      const meta = JSON.parse(readFileSync(metadataPath, 'utf8'));
      agentName = meta.agent || 'unknown';
    } catch {}
  }

  const episodes = buildEpisodes(memories);
  if (episodes.length === 0) return;

  const lastEpisode = episodes[episodes.length - 1];
  const accomplished: string[] = [];
  const unfinished: string[] = [];
  const blockers: string[] = [];
  const activeFiles: string[] = [];

  for (const ep of episodes) {
    // Collect active files
    for (const f of ep.filesTouched) {
      if (!activeFiles.includes(f)) activeFiles.push(f);
    }

    // Collect accomplished/unfinished goals
    if (ep.outcome.status === 'success') {
      accomplished.push(ep.goal);
    } else if (ep.outcome.status === 'failure') {
      blockers.push(ep.outcome.summary);
      unfinished.push(ep.goal);
    } else {
      unfinished.push(ep.goal);
    }
  }

  // Ensure last goal is specified
  const lastGoal = lastEpisode.goal;

  const handoff: HandoffData = {
    sessionId,
    agent: agentName,
    lastGoal,
    accomplished: accomplished.length > 0 ? accomplished : ['Initial session setup'],
    unfinished: unfinished.length > 0 ? unfinished : [],
    blockers: blockers.length > 0 ? blockers : [],
    activeFiles
  };

  // 1. Write Handoff JSON
  writeFileSync(handoffJsonPath, JSON.stringify(handoff, null, 2), 'utf8');

  // 2. Write Handoff MD
  const mdLines = [
    `# MindDiff Handoff: ${sessionId}`,
    `\n🤖 **Agent**: ${handoff.agent}`,
    `🎯 **Last Goal**: ${handoff.lastGoal}`,
    '\n🟢 **Accomplished**:',
    ...handoff.accomplished.map(item => `* ${item}`),
    '\n🟡 **Unfinished**:',
    ...(handoff.unfinished.length > 0 ? handoff.unfinished.map(item => `* ${item}`) : ['* None']),
    '\n⚠️ **Blockers**:',
    ...(handoff.blockers.length > 0 ? handoff.blockers.map(item => `* ${item}`) : ['* None']),
    '\n📂 **Active Files**:',
    ...(handoff.activeFiles.length > 0 ? handoff.activeFiles.map(item => `* \`${item}\``) : ['* None'])
  ];

  writeFileSync(handoffMdPath, mdLines.join('\n') + '\n', 'utf8');
}
