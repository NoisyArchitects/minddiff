import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { MemoryLedger, MemoryBlock } from '../compiler/types.js';

export interface SessionMetadata {
  id: string;
  agent: string;
  args: string[];
  createdAt: string;
  commits: string[];
}

export interface CommitMetadata {
  sha: string;
  message: string;
  timestamp: string;
  associatedSessions: string[];
  filesChanged: string[];
}

export interface SessionState {
  isRunning: boolean;
  pid?: number;
}

export interface MindDiffState {
  activeSessions: Record<string, SessionState>;
}

export function getDbDirectory(): string {
  return join(process.cwd(), '.minddiff');
}

export function ensureDatabaseStructure(): string {
  const base = getDbDirectory();
  mkdirSync(base, { recursive: true });
  mkdirSync(join(base, 'sessions'), { recursive: true });
  mkdirSync(join(base, 'commits'), { recursive: true });
  mkdirSync(join(base, 'summaries'), { recursive: true });
  mkdirSync(join(base, 'index'), { recursive: true });
  mkdirSync(join(base, 'config'), { recursive: true });
  return base;
}

const STATE_FILE_NAME = 'state.json';
const LOCK_FILE_NAME = 'state.json.lock';

function acquireLock(): void {
  ensureDatabaseStructure();
  const lockPath = join(getDbDirectory(), LOCK_FILE_NAME);
  const maxRetries = 50;
  const delay = 50; // ms
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      // wx flag throws error if file already exists
      writeFileSync(lockPath, 'lock', { flag: 'wx' });
      return;
    } catch {
      // Synchronous delay loop
      const start = Date.now();
      while (Date.now() - start < delay) {}
    }
  }
  // Safe fallback if lock is somehow orphaned (stale lock cleanup)
  try {
    writeFileSync(lockPath, 'lock');
  } catch {}
}

function releaseLock(): void {
  const lockPath = join(getDbDirectory(), LOCK_FILE_NAME);
  try {
    unlinkSync(lockPath);
  } catch {}
}

export function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err: any) {
    return err.code !== 'ESRCH';
  }
}

export function readState(): MindDiffState {
  ensureDatabaseStructure();
  const statePath = join(getDbDirectory(), STATE_FILE_NAME);
  if (!existsSync(statePath)) {
    return { activeSessions: {} };
  }
  try {
    const data = readFileSync(statePath, 'utf8');
    return JSON.parse(data) as MindDiffState;
  } catch {
    return { activeSessions: {} };
  }
}

export function writeState(state: MindDiffState): void {
  ensureDatabaseStructure();
  const statePath = join(getDbDirectory(), STATE_FILE_NAME);
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
}

export function addActiveSession(sessionId: string, pid: number): void {
  acquireLock();
  try {
    const state = readState();
    state.activeSessions[sessionId] = { isRunning: true, pid };
    writeState(state);
  } finally {
    releaseLock();
  }
}

export function updateSessionRunningStatus(sessionId: string, isRunning: boolean): void {
  acquireLock();
  try {
    const state = readState();
    if (state.activeSessions[sessionId]) {
      state.activeSessions[sessionId].isRunning = isRunning;
      writeState(state);
    }
  } finally {
    releaseLock();
  }
}

export function removeActiveSession(sessionId: string): void {
  acquireLock();
  try {
    const state = readState();
    delete state.activeSessions[sessionId];
    writeState(state);
  } finally {
    releaseLock();
  }
}

export function createSession(agentName: string, args: string[]): { sessionId: string; logPath: string; metadataPath: string } {
  ensureDatabaseStructure();
  const dbDir = getDbDirectory();
  
  // Create unique filename-safe session identifier using ISO timestamp and random suffix to avoid collisions
  const date = new Date();
  const timestamp = date.toISOString().replace(/[:.]/g, '-');
  const randomSuffix = Math.random().toString(36).substring(2, 6);
  const sessionId = `session-${timestamp}-${randomSuffix}`;
  
  const logPath = join(dbDir, 'sessions', `${sessionId}.log`);
  const metadataPath = join(dbDir, 'sessions', `${sessionId}.json`);
  
  const metadata: SessionMetadata = {
    id: sessionId,
    agent: agentName,
    args: args,
    createdAt: date.toISOString(),
    commits: []
  };
  
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  
  return { sessionId, logPath, metadataPath };
}

export function updateSessionCommits(sessionId: string, commitSha: string): void {
  const dbDir = getDbDirectory();
  const metadataPath = join(dbDir, 'sessions', `${sessionId}.json`);
  if (existsSync(metadataPath)) {
    try {
      const data = readFileSync(metadataPath, 'utf8');
      const metadata = JSON.parse(data) as SessionMetadata;
      if (!metadata.commits.includes(commitSha)) {
        metadata.commits.push(commitSha);
        writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
      }
    } catch (err) {
      console.error(`Failed to update session commits for ${sessionId}:`, err);
    }
  }
}

export function writeCommitMetadata(sha: string, metadata: CommitMetadata): void {
  ensureDatabaseStructure();
  const dbDir = getDbDirectory();
  const commitPath = join(dbDir, 'commits', `${sha}.json`);
  writeFileSync(commitPath, JSON.stringify(metadata, null, 2), 'utf8');
}

export function isCommitRecorded(sha: string): boolean {
  const dbDir = getDbDirectory();
  const commitPath = join(dbDir, 'commits', `${sha}.json`);
  return existsSync(commitPath);
}

export function getLatestLogFile(): string | null {
  ensureDatabaseStructure();
  const sessionsDir = join(getDbDirectory(), 'sessions');
  if (!existsSync(sessionsDir)) return null;

  const files = readdirSync(sessionsDir)
    .filter((f: string) => f.endsWith('.log'))
    .map((f: string) => ({
      name: f,
      path: join(sessionsDir, f),
      mtime: statSync(join(sessionsDir, f)).mtimeMs
    }))
    .sort((a: { mtime: number }, b: { mtime: number }) => b.mtime - a.mtime);

  return files.length > 0 ? files[0].path : null;
}

export function getAllSessions(): SessionMetadata[] {
  ensureDatabaseStructure();
  const sessionsDir = join(getDbDirectory(), 'sessions');
  if (!existsSync(sessionsDir)) return [];

  const files = readdirSync(sessionsDir);
  const sessions: SessionMetadata[] = [];

  for (const file of files) {
    if (file.startsWith('session-') && file.endsWith('.json') && !file.endsWith('.memory.json')) {
      try {
        const filePath = join(sessionsDir, file);
        const data = readFileSync(filePath, 'utf8');
        const meta = JSON.parse(data) as SessionMetadata;
        sessions.push(meta);
      } catch (err) {
        // Skip malformed session files
      }
    }
  }

  return sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getSession(sessionId: string): SessionMetadata | null {
  ensureDatabaseStructure();
  const metadataPath = join(getDbDirectory(), 'sessions', `${sessionId}.json`);
  if (!existsSync(metadataPath)) return null;

  try {
    const data = readFileSync(metadataPath, 'utf8');
    return JSON.parse(data) as SessionMetadata;
  } catch {
    return null;
  }
}

export function getSessionMemory(sessionId: string): MemoryLedger | null {
  ensureDatabaseStructure();
  const memoryPath = join(getDbDirectory(), 'sessions', `${sessionId}.memory.json`);
  if (!existsSync(memoryPath)) return null;

  try {
    const data = readFileSync(memoryPath, 'utf8');
    return JSON.parse(data) as MemoryLedger;
  } catch {
    return null;
  }
}

export function getSessionRawLog(sessionId: string): string | null {
  ensureDatabaseStructure();
  const logPath = join(getDbDirectory(), 'sessions', `${sessionId}.log`);
  if (!existsSync(logPath)) return null;

  try {
    return readFileSync(logPath, 'utf8');
  } catch {
    return null;
  }
}

export function getCommitMetadata(sha: string): CommitMetadata | null {
  ensureDatabaseStructure();
  const commitDir = join(getDbDirectory(), 'commits');
  
  let targetSha = sha;
  if (sha.length < 40) {
    if (existsSync(commitDir)) {
      const files = readdirSync(commitDir);
      const match = files.find(f => f.startsWith(sha) && f.endsWith('.json'));
      if (match) {
        targetSha = match.replace('.json', '');
      }
    }
  }

  const commitPath = join(commitDir, `${targetSha}.json`);
  if (!existsSync(commitPath)) return null;

  try {
    const data = readFileSync(commitPath, 'utf8');
    return JSON.parse(data) as CommitMetadata;
  } catch {
    return null;
  }
}

export function getAllMemories(tag?: string): (MemoryBlock & { sessionId: string })[] {
  const sessions = getAllSessions();
  const allMems: (MemoryBlock & { sessionId: string })[] = [];

  for (const session of sessions) {
    const ledger = getSessionMemory(session.id);
    if (ledger && ledger.memories) {
      for (const mem of ledger.memories) {
        if (!tag || mem.inferred.tags.some(t => t.name.toLowerCase() === tag.toLowerCase())) {
          allMems.push({ ...mem, sessionId: session.id });
        }
      }
    }
  }

  return allMems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

