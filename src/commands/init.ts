import { existsSync, writeFileSync, readFileSync, mkdirSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { ensureDatabaseStructure, getDbDirectory } from '../storage/db.js';
import { isGitRepository } from '../storage/git.js';

export function initCommand() {
  console.log('Installing MindDiff...');

  try {
    // 1. Create .minddiff structure
    ensureDatabaseStructure();
    console.log('✓ Created .minddiff');

    // 2. Configure Git hook
    if (isGitRepository()) {
      const hookDir = join(process.cwd(), '.git', 'hooks');
      const hookPath = join(hookDir, 'post-commit');
      
      mkdirSync(hookDir, { recursive: true });

      const hookContent = '\n# MindDiff post-commit hook\nnpx --no-install minddiff sync 2>/dev/null || minddiff sync\n';

      if (existsSync(hookPath)) {
        const existing = readFileSync(hookPath, 'utf8');
        if (!existing.includes('minddiff sync')) {
          writeFileSync(hookPath, existing + hookContent, 'utf8');
          console.log('✓ Configured existing Git hooks');
        } else {
          console.log('✓ Git hooks already configured');
        }
      } else {
        const shellHeader = '#!/bin/sh\n';
        writeFileSync(hookPath, shellHeader + hookContent, 'utf8');
        console.log('✓ Installed Git hooks');
      }

      // Ensure execute permissions on the hook
      try {
        chmodSync(hookPath, 0o755);
      } catch (chmodErr: any) {
        console.warn(`Warning: Could not make hook executable: ${chmodErr.message}`);
      }
    } else {
      console.log('⚠ Not inside a Git repository. Git hooks installation skipped.');
    }

    // 3. Configure workspace
    const configPath = join(getDbDirectory(), 'config', 'config.json');
    if (!existsSync(configPath)) {
      writeFileSync(configPath, JSON.stringify({ version: '1.0.0' }, null, 2), 'utf8');
    }
    const statePath = join(getDbDirectory(), 'state.json');
    if (!existsSync(statePath)) {
      writeFileSync(statePath, JSON.stringify({ activeSessions: {} }, null, 2), 'utf8');
    }
    console.log('✓ Configured workspace');
    console.log('\nMindDiff successfully initialized!');
  } catch (err: any) {
    console.error('Failed to initialize MindDiff:', err.message);
    process.exit(1);
  }
}
