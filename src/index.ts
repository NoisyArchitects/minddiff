import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * MindDiff V1 Architecture:
 * 
 * 1. Simple script execution: We use standard Node.js APIs (fs, child_process).
 * 2. Git Integration: We shell out to `git` to keep it lightweight and zero-dependency.
 * 3. File System: Everything is local-first, stored in `/minddiff/logs`.
 */

function getGitInfo() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
    const commit = execSync('git rev-parse --short HEAD').toString().trim();
    const changedFiles = execSync('git status --short').toString().trim()
      .split('\n')
      .filter(line => line.length > 0)
      .map(line => line.substring(3)); // Remove status prefixes (e.g., ' M ')

    return { branch, commit, changedFiles };
  } catch (error) {
    console.error('Error: Not a git repository or git not found.');
    process.exit(1);
  }
}

function capture(slug: string = 'reasoning-log') {
  const { branch, commit, changedFiles } = getGitInfo();
  
  // 1. Prepare timestamp and filename
  const now = new Date();
  const timestamp = now.toISOString();
  // Format: 2026-05-17T05-12-33
  const fileTimestamp = timestamp.replace(/:/g, '-').split('.')[0];
  const filename = `${fileTimestamp}-${slug}.md`;
  
  // 2. Ensure directory exists
  const logsDir = join(process.cwd(), 'minddiff', 'logs');
  mkdirSync(logsDir, { recursive: true });

  // 3. Construct Markdown content
  const content = `---
timestamp: ${timestamp}
branch: ${branch}
commit: ${commit}
changed_files:
${changedFiles.map(f => `  - ${f}`).join('\n')}
---

# ${slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}

## Implementation Summary
[Add summary of changes here]

## AI Reasoning
[Paste or add AI reasoning/context here]

## Risks / Open Questions
- None
`;

  // 4. Write file
  const filePath = join(logsDir, filename);
  writeFileSync(filePath, content);
  
  console.log(`\n✅ MindDiff trace captured:`);
  console.log(`   ${filePath}`);
}

// Minimal CLI entry point
const args = process.argv.slice(2);
const command = args[0];
const slug = args[1];

if (command === 'capture') {
  capture(slug);
} else {
  console.log('Usage: npm run dev -- capture <optional-slug>');
}
