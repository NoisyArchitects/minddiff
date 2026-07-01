export interface RawSegment {
  text: string;
  source: 'user' | 'agent' | 'system';
  observedType: string;
  command?: string;
  exitCode?: number;
  startIndex: number;
  endIndex: number;
}

/**
 * Pass 3: Memory Segmentation
 * Scans the cleaned text line-by-line and groups them into logical segments
 * based on structural command boundaries, user prompts, error signatures, and tool markers.
 */
export function segmentTerminalText(cleanedText: string): RawSegment[] {
  const lines = cleanedText.split('\n');
  const segments: RawSegment[] = [];
  
  let currentSegmentLines: string[] = [];
  let currentSource: 'user' | 'agent' | 'system' = 'agent';
  let currentType = 'thought';
  let segmentStartIdx = 0;
  let currentIdx = 0;

  const commitSegment = () => {
    if (currentSegmentLines.length > 0) {
      const segmentText = currentSegmentLines.join('\n');
      segments.push({
        text: segmentText,
        source: currentSource,
        observedType: currentType,
        startIndex: segmentStartIdx,
        endIndex: segmentStartIdx + segmentText.length
      });
      currentSegmentLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Session start boundary - always single line and committed immediately
    if (trimmed.startsWith('-- MindDiff: Starting')) {
      commitSegment();
      segments.push({
        text: line,
        source: 'system',
        observedType: 'session_start',
        startIndex: currentIdx,
        endIndex: currentIdx + line.length
      });
      currentSegmentLines = [];
      currentSource = 'agent';
      currentType = 'thought';
      segmentStartIdx = currentIdx + line.length + 1;
    } 
    // 2. Shell command execution boundary (e.g. "$ npm test")
    else if (trimmed.startsWith('$ ') || (trimmed.startsWith('>') && !trimmed.startsWith('>>') && !trimmed.startsWith('>>>'))) {
      commitSegment();
      currentSource = 'user';
      currentType = 'command_execution';
      segmentStartIdx = currentIdx;
      currentSegmentLines.push(line);
    } 
    // 3. Compiler / Test failure headers
    else if (
      /^(error TS\d+:|Traceback \(most recent call last\):|\d+:\d+\s+error\s+|FAIL\s+|✕\s+|Exception\s+)/.test(trimmed) ||
      trimmed.includes('Linter Error')
    ) {
      commitSegment();
      currentSource = 'system';
      currentType = 'error_observation';
      segmentStartIdx = currentIdx;
      currentSegmentLines.push(line);
    } 
    // 4. Tool call signature boundaries
    else if (
      trimmed.startsWith('[tool_call]') ||
      trimmed.startsWith('Calling tool ') ||
      trimmed.startsWith('Tool output:')
    ) {
      commitSegment();
      currentSource = 'agent';
      currentType = 'tool_call';
      segmentStartIdx = currentIdx;
      currentSegmentLines.push(line);
    }
    // 5. Default accumulation block
    else {
      // If we were in an error observation and this line is NOT a follow-up error,
      // commit the error segment and transition back to a thought segment.
      if (currentType === 'error_observation') {
        commitSegment();
        currentSource = 'agent';
        currentType = 'thought';
        segmentStartIdx = currentIdx;
      }
      
      if (currentSegmentLines.length === 0) {
        segmentStartIdx = currentIdx;
        currentSource = 'agent';
        currentType = 'thought';
      }
      currentSegmentLines.push(line);
    }
    
    currentIdx += line.length + 1;
  }
  
  commitSegment();
  return segments;
}
