import { existsSync } from 'node:fs';
import { getDbDirectory, createSession, addActiveSession, updateSessionRunningStatus, removeActiveSession } from '../storage/db.js';
import { createLogStream } from '../runtime/stream.js';
import { getAgent } from '../runtime/agent.js';
import { syncCommits, isGitRepository } from '../storage/git.js';
import { compileSession } from '../compiler/pipeline.js';

export async function runCommand(agentName: string, args: string[]): Promise<number> {
  const dbDir = getDbDirectory();
  if (!existsSync(dbDir)) {
    console.error('MindDiff is not initialized in this directory. Please run "minddiff init" first.');
    return 1;
  }

  // Sync any previous commits before starting the new session
  syncCommits();

  // Create session files
  const { sessionId, logPath } = createSession(agentName, args);

  // Set the session as active and running in state.json
  addActiveSession(sessionId, process.pid);

  const logStream = createLogStream(logPath);
  
  console.log(`-- MindDiff: Starting ${agentName} (logging to ${logPath}) --\n`);

  try {
    const agent = getAgent(agentName);
    const exitCode = await agent.execute(args, logStream);

    // Toggle running status to false upon exit
    updateSessionRunningStatus(sessionId, false);

    // Compile session logs into memory.json
    try {
      await compileSession(sessionId);
    } catch (compileErr: any) {
      console.error(`MindDiff Memory Compilation Failed: ${compileErr.message}`);
    }

    // Sync any commits made during the session immediately
    syncCommits();

    if (!isGitRepository()) {
      removeActiveSession(sessionId);
    }

    return exitCode;
  } catch (err: any) {
    console.error(`MindDiff Error while running agent ${agentName}:`, err.message);
    updateSessionRunningStatus(sessionId, false);

    // Attempt memory compilation even on failure to preserve raw.log history
    try {
      await compileSession(sessionId);
    } catch (compileErr: any) {
      console.error(`MindDiff Memory Compilation Failed: ${compileErr.message}`);
    }

    if (!isGitRepository()) {
      removeActiveSession(sessionId);
    }
    return 1;
  }
}
