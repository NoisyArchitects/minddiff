import { writeFileSync, existsSync, readFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { getDbDirectory } from '../src/storage/db.js';
import { reconstructTerminal } from '../src/compiler/passes/reconstruct.js';
import { segmentTerminalText } from '../src/compiler/passes/segment.js';
import { inferCognition } from '../src/compiler/passes/infer.js';
import { buildEpisodes, generateHandoff } from '../src/compiler/episodes.js';
import { MemoryBlock } from '../src/compiler/types.js';

interface TestCase {
  name: string;
  input: string;
  expected: string;
}

const testCases: TestCase[] = [
  {
    name: 'Spinner Overwriting (Carriage Return)',
    input: '⠋ Building...\r⠙ Building...\r⠹ Building...\r⠸ Building...\nDone!',
    expected: '⠸ Building...\nDone!'
  },
  {
    name: 'Cursor Up Movement (CSI A)',
    input: 'Line 1\nLine 2\u001b[A\rOverwritten Line 1\nLine 2 Updated',
    expected: 'Overwritten Line 1\nLine 2 Updated'
  },
  {
    name: 'Double-width Characters & Emoji Alignment',
    input: 'Hello 🚀 World!\nこんにちは!',
    expected: 'Hello 🚀 World!\nこんにちは!'
  },
  {
    name: 'Alternate Screen Buffer Exclusion (?1049h/l)',
    input: 'Command Started\n\u001b[?1049hSecret Editor Text\nMore Editor Text\u001b[?1049lCommand Finished',
    expected: 'Command Started\nCommand Finished'
  },
  {
    name: 'Clear Line (CSI K / 0K)',
    input: 'Starting build...\r\u001b[KDone!\nNext Step',
    expected: 'Done!\nNext Step'
  },
  {
    name: 'Interleaved Output with Backspaces and Clear Line',
    input: 'Stdout Line 1\nStdout Line 2\rStderr Line 2 Overwrite\u001b[K\nFinished',
    expected: 'Stdout Line 1\nStderr Line 2 Overwrite\nFinished'
  },
  {
    name: 'Backspace character processing (Terminal deletion sequence: \\b \\b)',
    input: 'abc\b \b\b \bd\nFinished',
    expected: 'ad\nFinished'
  }
];

let passedCount = 0;
let failedCount = 0;

console.log('\nMindDiff Reconstructor Test Suite');
console.log('=================================');

for (const tc of testCases) {
  try {
    const result = reconstructTerminal(tc.input);
    if (result === tc.expected) {
      console.log(`🟢 PASS: ${tc.name}`);
      passedCount++;
    } else {
      console.log(`🔴 FAIL: ${tc.name}`);
      failedCount++;
    }
  } catch (err: any) {
    console.log(`🔴 ERROR: ${tc.name} threw exception:`, err.message);
    failedCount++;
  }
}

// -------------------------------------------------------------
// Memory Compiler Tests (Segmentation & Inference)
// -------------------------------------------------------------
console.log('\nMindDiff Memory Compiler Test Suite');
console.log('===================================');

const mockCleanTranscript = [
  '-- MindDiff: Starting session --',
  'I need to look for linter errors.',
  'Calling tool grep_search with query "emit"...',
  '$ npm run build',
  'error TS2322: Type "string" is not assignable to type "number".',
  'Done!'
].join('\n');

try {
  const segments = segmentTerminalText(mockCleanTranscript);
  
  if (segments.length === 6) {
    console.log('🟢 PASS: Correct segment segmentation count (6 segments)');
    passedCount++;
  } else {
    console.log(`🔴 FAIL: Expected 6 segments, got ${segments.length}`);
    failedCount++;
  }

  const seg0 = segments[0];
  if (seg0.observedType === 'session_start' && seg0.source === 'system') {
    console.log('🟢 PASS: Segment 0 correctly parsed as system session_start');
    passedCount++;
  } else {
    console.log(`🔴 FAIL: Segment 0 mismatch`);
    failedCount++;
  }

  const seg2 = segments[2];
  const cog2 = inferCognition(seg2);
  const hasRepoTag = cog2.tags.some(t => t.name === 'repository_search');
  if (seg2.observedType === 'tool_call' && hasRepoTag && cog2.intent === 'Search or view repository') {
    console.log('🟢 PASS: Segment 2 correctly parsed as repository_search tool call');
    passedCount++;
  } else {
    console.log(`🔴 FAIL: Segment 2 tool call mismatch`);
    failedCount++;
  }

  const seg3 = segments[3];
  const cog3 = inferCognition(seg3);
  const hasCompTag = cog3.tags.some(t => t.name === 'compilation');
  if (seg3.observedType === 'command_execution' && hasCompTag && cog3.intent.includes('npm run build')) {
    console.log('🟢 PASS: Segment 3 correctly parsed as compilation execution command');
    passedCount++;
  } else {
    console.log(`🔴 FAIL: Segment 3 command mismatch`);
    failedCount++;
  }

  const seg4 = segments[4];
  const cog4 = inferCognition(seg4);
  const hasDebugTag = cog4.tags.some(t => t.name === 'debugging');
  const capturedConstraint = cog4.constraints && cog4.constraints[0];
  if (
    seg4.observedType === 'error_observation' && 
    hasDebugTag && 
    capturedConstraint === 'error TS2322: Type "string" is not assignable to type "number".'
  ) {
    console.log('🟢 PASS: Segment 4 correctly parsed as compiler error_observation and captured exact constraint');
    passedCount++;
  } else {
    console.log(`🔴 FAIL: Segment 4 error mismatch`);
    failedCount++;
  }

} catch (err: any) {
  console.log('🔴 ERROR: Memory Compiler test execution failed:', err.message);
  failedCount++;
}

// -------------------------------------------------------------
// Memory Explorer & Handoff Tests (Step 3)
// -------------------------------------------------------------
console.log('\nMindDiff Memory Explorer & Handoff Test Suite');
console.log('=============================================');

const mockMemories: MemoryBlock[] = [
  {
    id: 'mem-1',
    timestamp: new Date().toISOString(),
    source: 'system',
    observed: { type: 'session_start', summary: 'Initialize developer session' },
    inferred: { intent: 'Initialize developer session', tags: [{ name: 'session_start', confidence: 1.0 }] },
    text: '-- MindDiff: Starting session --',
    rawRef: { startByte: 0, endByte: 32 }
  },
  {
    id: 'mem-2',
    timestamp: new Date().toISOString(),
    source: 'user',
    observed: { type: 'thought', summary: 'Fix compiler errors in reconstruct.ts' },
    inferred: { intent: 'Fix compiler errors in reconstruct.ts', tags: [{ name: 'user_input', confidence: 1.0 }] },
    text: 'Fix compiler errors in reconstruct.ts',
    rawRef: { startByte: 33, endByte: 70 }
  },
  {
    id: 'mem-3',
    timestamp: new Date().toISOString(),
    source: 'agent',
    observed: { type: 'tool_call', summary: 'Modify repository file' },
    inferred: { intent: 'Modify repository file', tags: [{ name: 'tool_invocation', confidence: 1.0 }, { name: 'code_edit', confidence: 0.98 }] },
    text: 'replace_file_content called for file "src/compiler/passes/reconstruct.ts"',
    rawRef: { startByte: 71, endByte: 145 }
  },
  {
    id: 'mem-4',
    timestamp: new Date().toISOString(),
    source: 'user',
    observed: { type: 'command_execution', summary: 'Execute shell command: npm run build' },
    inferred: { intent: 'Execute shell command: npm run build', tags: [{ name: 'command_execution', confidence: 1.0 }, { name: 'compilation', confidence: 0.95 }] },
    text: '$ npm run build',
    rawRef: { startByte: 146, endByte: 161 }
  }
];

try {
  // 1. Test buildEpisodes
  const episodes = buildEpisodes(mockMemories);
  if (episodes.length === 2) {
    console.log('🟢 PASS: Correct projected episodes count (2 episodes)');
    passedCount++;
  } else {
    console.log(`🔴 FAIL: Expected 2 episodes, got ${episodes.length}`);
    failedCount++;
  }

  const ep1 = episodes[1];
  if (ep1.goal === 'Fix compiler errors in reconstruct.ts' && ep1.filesTouched.includes('src/compiler/passes/reconstruct.ts')) {
    console.log('🟢 PASS: Episode 1 correctly projected goal and extracted active files');
    passedCount++;
  } else {
    console.log(`🔴 FAIL: Episode 1 projection mismatch: goal=${ep1.goal}, files=${JSON.stringify(ep1.filesTouched)}`);
    failedCount++;
  }

  // 2. Test generateHandoff
  const dbDir = getDbDirectory();
  const mockSessionId = 'session-test-handoff-mock';
  const metadataPath = join(dbDir, 'sessions', `${mockSessionId}.json`);
  const handoffJsonPath = join(dbDir, 'sessions', `${mockSessionId}.handoff.json`);
  const handoffMdPath = join(dbDir, 'sessions', `${mockSessionId}.handoff.md`);

  // Write temporary metadata
  writeFileSync(metadataPath, JSON.stringify({ id: mockSessionId, agent: 'gemini' }), 'utf8');

  // Trigger generator
  generateHandoff(mockSessionId, mockMemories);

  if (existsSync(handoffJsonPath) && existsSync(handoffMdPath)) {
    const handoffJson = JSON.parse(readFileSync(handoffJsonPath, 'utf8'));
    if (
      handoffJson.agent === 'gemini' && 
      handoffJson.lastGoal === 'Fix compiler errors in reconstruct.ts' &&
      handoffJson.activeFiles.includes('src/compiler/passes/reconstruct.ts')
    ) {
      console.log('🟢 PASS: Session handoff JSON and MD compiled with correct properties');
      passedCount++;
    } else {
      console.log('🔴 FAIL: Handoff content properties mismatch');
      failedCount++;
    }
  } else {
    console.log('🔴 FAIL: Handoff files were not generated on disk');
    failedCount++;
  }

  // Cleanup mock test files
  if (existsSync(metadataPath)) unlinkSync(metadataPath);
  if (existsSync(handoffJsonPath)) unlinkSync(handoffJsonPath);
  if (existsSync(handoffMdPath)) unlinkSync(handoffMdPath);

} catch (err: any) {
  console.log('🔴 ERROR: Memory Explorer & Handoff test execution failed:', err.message);
  failedCount++;
}

console.log('\n=============================================');
console.log(`Summary: ${passedCount} passed, ${failedCount} failed`);

if (failedCount > 0) {
  process.exit(1);
} else {
  console.log('All tests passed successfully! 🎉\n');
  process.exit(0);
}
