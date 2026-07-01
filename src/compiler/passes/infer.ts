import { RawSegment } from './segment.js';
import { InferredCognition, Tag } from '../types.js';

/**
 * Pass 4: Cognitive Inference & Tagging
 * Scans segment content to derive intent, tag confidence scores, and core execution constraints
 * based on structural classification rather than raw keyword matches.
 */
export function inferCognition(segment: RawSegment): InferredCognition {
  const tags: Tag[] = [];
  const constraints: string[] = [];
  let intent = '';

  // 1. Analyze Shell Commands
  if (segment.observedType === 'command_execution') {
    const firstLine = segment.text.split('\n')[0].trim();
    const commandText = firstLine.startsWith('$ ') 
      ? firstLine.substring(2) 
      : firstLine.startsWith('>') 
        ? firstLine.substring(1).trim() 
        : firstLine;
    
    intent = `Execute shell command: ${commandText}`;
    tags.push({ name: 'command_execution', confidence: 1.0 });

    const lowerCmd = commandText.toLowerCase();
    if (lowerCmd.includes('test') || lowerCmd.includes('jest') || lowerCmd.includes('vitest') || lowerCmd.includes('pytest')) {
      tags.push({ name: 'validation', confidence: 0.95 });
    }
    if (lowerCmd.includes('build') || lowerCmd.includes('tsc') || lowerCmd.includes('compile') || lowerCmd.includes('make')) {
      tags.push({ name: 'compilation', confidence: 0.95 });
    }
  } 
  // 2. Analyze Compiler / Test failures (error_observation)
  else if (segment.observedType === 'error_observation') {
    intent = 'Triage compiler or testing error';
    tags.push({ name: 'debugging', confidence: 1.0 });
    tags.push({ name: 'triage', confidence: 0.90 });

    const lines = segment.text.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^(error TS\d+:|Traceback \(most recent call last\):|\d+:\d+\s+error\s+|FAIL\s+|✕\s+)/.test(trimmed)) {
        constraints.push(trimmed);
      }
    }
  } 
  // 3. Analyze Tool Calls
  else if (segment.observedType === 'tool_call') {
    tags.push({ name: 'tool_invocation', confidence: 1.0 });
    
    const text = segment.text.toLowerCase();
    // File edit signatures
    if (text.includes('write_to_file') || text.includes('replace_file_content') || text.includes('multi_replace')) {
      tags.push({ name: 'code_edit', confidence: 0.98 });
      intent = 'Modify repository file';
    } 
    // File search / read signatures
    else if (text.includes('list_dir') || text.includes('grep_search') || text.includes('view_file')) {
      tags.push({ name: 'repository_search', confidence: 0.98 });
      intent = 'Search or view repository';
    } else {
      intent = 'Execute agent tool';
    }
  } 
  // 4. Analyze Session Start
  else if (segment.observedType === 'session_start') {
    intent = 'Initialize developer session';
    tags.push({ name: 'session_start', confidence: 1.0 });
  } 
  // 5. Default Agent Thought / User Prompts
  else {
    if (segment.source === 'user') {
      intent = segment.text.split('\n')[0].trim().substring(0, 100);
      tags.push({ name: 'user_input', confidence: 1.0 });
    } else {
      const firstLine = segment.text.split('\n')[0].trim().substring(0, 100);
      intent = firstLine || 'Analyze system state';
      tags.push({ name: 'thought', confidence: 0.80 });
    }
  }

  return {
    intent,
    tags,
    constraints: constraints.length > 0 ? constraints : undefined
  };
}
