import { RawSegment } from './segment.js';
import { InferredCognition, Tag } from '../types.js';

/**
 * Pass 4: Cognitive Inference & Tagging
 * Scans segment content to derive intent, tag confidence scores, and core execution constraints.
 */
export function inferCognition(segment: RawSegment): InferredCognition {
  const text = segment.text.toLowerCase();
  const tags: Tag[] = [];
  const constraints: string[] = [];
  let intent = '';

  // 1. Tagging: debugging & validation (test runs or compiler errors)
  if (text.includes('error') || text.includes('exception') || text.includes('failed') || text.includes('crash')) {
    tags.push({ name: 'debugging', confidence: 0.90 });
    tags.push({ name: 'validation', confidence: 0.85 });
    
    // Extract potential constraints/errors
    const lines = segment.text.split('\n');
    for (const line of lines) {
      if (line.includes('Error:') || line.includes('Exception:') || line.includes('Fail:')) {
        constraints.push(line.trim());
      }
    }
  }

  // 2. Tagging: validation (successful tests/checks)
  if (text.includes('pass') || text.includes('passing') || text.includes('success') || text.includes('ok')) {
    tags.push({ name: 'validation', confidence: 0.90 });
  }

  // 3. Tagging: planning & refactoring
  if (text.includes('plan') || text.includes('todo') || text.includes('refactor') || text.includes('restructure') || text.includes('design')) {
    tags.push({ name: 'planning', confidence: 0.95 });
    if (text.includes('refactor') || text.includes('restructure')) {
      tags.push({ name: 'refactoring', confidence: 0.90 });
    }
  }

  // 4. Tagging: tool_invocation & code edits
  if (text.includes('write_to_file') || text.includes('replace_file_content') || text.includes('diff') || text.includes('multi_replace')) {
    tags.push({ name: 'code_edit', confidence: 0.98 });
    tags.push({ name: 'tool_invocation', confidence: 0.95 });
  }

  // 5. Tagging: repository/file search
  if (text.includes('list_dir') || text.includes('grep_search') || text.includes('view_file') || text.includes('search_web')) {
    tags.push({ name: 'repository_search', confidence: 0.95 });
    tags.push({ name: 'tool_invocation', confidence: 0.95 });
  }

  // 6. Default Tagging if empty
  if (tags.length === 0) {
    if (segment.source === 'user') {
      tags.push({ name: 'user_input', confidence: 1.0 });
    } else {
      tags.push({ name: 'thought', confidence: 0.70 });
    }
  }

  // Determine Intent (Summary heuristics)
  if (segment.observedType === 'command_execution') {
    intent = `Execute shell command: ${segment.text.split('\n')[0].trim()}`;
  } else if (segment.observedType === 'session_start') {
    intent = 'Initialize developer session';
  } else {
    // Generate intent from the first line of the segment text
    const firstLine = segment.text.split('\n')[0].trim().substring(0, 100);
    intent = firstLine || 'Analyze system state';
  }

  return {
    intent,
    tags,
    constraints: constraints.length > 0 ? constraints : undefined
  };
}
