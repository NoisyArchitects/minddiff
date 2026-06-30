import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { getDbDirectory } from '../storage/db.js';
import { reconstructTerminal } from './passes/reconstruct.js';
import { cleanTerminalText } from './passes/clean.js';
import { segmentTerminalText } from './passes/segment.js';
import { emitMemories } from './passes/emit.js';
import { MemoryLedger } from './types.js';

/**
 * Memory Compiler Pipeline
 * Orchestrates the execution of Pass 1 through Pass 5 on a given session.
 */
export async function compileSession(sessionId: string): Promise<void> {
  const dbDir = getDbDirectory();
  const logPath = join(dbDir, 'sessions', `${sessionId}.log`);
  const memoryPath = join(dbDir, 'sessions', `${sessionId}.memory.json`);

  if (!existsSync(logPath)) {
    throw new Error(`Cannot compile session. Log file not found: ${logPath}`);
  }

  const rawLog = readFileSync(logPath, 'utf8');

  // Pass 1: Terminal Reconstruction
  const reconstructed = reconstructTerminal(rawLog);

  // Pass 2: Sanitization & Cleaning
  const cleaned = cleanTerminalText(reconstructed);

  // Pass 3: Memory Segmentation
  const segments = segmentTerminalText(cleaned);

  // Pass 4 & 5: Inference, Tagging, and Emission
  const memories = emitMemories(segments, rawLog);

  const ledger: MemoryLedger = {
    compilerVersion: '1.0.0',
    schemaVersion: '1.0.0',
    memories
  };

  writeFileSync(memoryPath, JSON.stringify(ledger, null, 2), 'utf8');
}
