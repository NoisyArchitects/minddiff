import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { 
  readState, 
  writeState, 
  isCommitRecorded, 
  writeCommitMetadata, 
  updateSessionCommits, 
  removeActiveSession,
  isPidAlive,
  getDbDirectory
} from './db.js';

export function isGitRepository(): boolean {
  try {
    const result = execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    return result.toString().trim() === 'true';
  } catch {
    return false;
  }
}

export function getCurrentHead(): string | null {
  try {
    const result = execSync('git rev-parse HEAD', { stdio: 'pipe' });
    return result.toString().trim();
  } catch {
    return null;
  }
}

export interface GitCommitDetails {
  sha: string;
  message: string;
  timestamp: string;
  filesChanged: string[];
}

export function getCommitDetails(sha: string): GitCommitDetails | null {
  try {
    // %cI is ISO 8601 committer date, %B is raw commit body
    const info = execSync(`git show -s --format="%cI|%B" ${sha}`, { stdio: 'pipe' }).toString().trim();
    const delimiterIndex = info.indexOf('|');
    if (delimiterIndex === -1) return null;

    const timestamp = info.substring(0, delimiterIndex);
    const message = info.substring(delimiterIndex + 1).trim();

    // Get list of files changed
    const files = execSync(`git show --name-only --format="" ${sha}`, { stdio: 'pipe' })
      .toString()
      .trim()
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    return {
      sha,
      message,
      timestamp,
      filesChanged: files
    };
  } catch (err) {
    console.error(`Failed to get git commit details for SHA ${sha}:`, err);
    return null;
  }
}

export function syncCommits(): void {
  if (!existsSync(getDbDirectory())) {
    return;
  }

  // Clean up any orphaned sessions (processes that died/crashed)
  const preState = readState();
  const preSessionIds = Object.keys(preState.activeSessions);
  for (const sessionId of preSessionIds) {
    const session = preState.activeSessions[sessionId];
    const isAlive = session.pid ? isPidAlive(session.pid) : true;
    if (!isAlive) {
      removeActiveSession(sessionId);
      console.log(`-- MindDiff: Sealed orphaned session ${sessionId} --`);
    }
  }

  if (!isGitRepository()) {
    return;
  }

  const headSha = getCurrentHead();
  if (!headSha) {
    return;
  }

  // If this commit is already recorded, it is synced
  if (isCommitRecorded(headSha)) {
    return;
  }

  const state = readState();
  const sessionIds = Object.keys(state.activeSessions);
  if (sessionIds.length === 0) {
    return;
  }

  // Get current commit details from Git
  const commitDetails = getCommitDetails(headSha);
  if (!commitDetails) {
    return;
  }

  console.log(`-- MindDiff: Syncing commit ${headSha.substring(0, 7)} with active sessions --`);

  // Record commit metadata mapping back to all active sessions
  writeCommitMetadata(headSha, {
    sha: headSha,
    message: commitDetails.message,
    timestamp: commitDetails.timestamp,
    associatedSessions: sessionIds,
    filesChanged: commitDetails.filesChanged
  });

  // Append commit SHA to each active session's JSON file
  for (const sessionId of sessionIds) {
    updateSessionCommits(sessionId, headSha);
  }

  // Seal any sessions that are no longer running or have been orphaned (process dead)
  for (const sessionId of sessionIds) {
    const session = state.activeSessions[sessionId];
    const isAlive = session.pid ? isPidAlive(session.pid) : true;
    if (!session.isRunning || !isAlive) {
      removeActiveSession(sessionId);
      console.log(`-- MindDiff: Sealed session ${sessionId} --`);
    }
  }
}
