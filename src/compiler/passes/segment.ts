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
 * based on command boundaries, user prompts, error outputs, and tool invocation markers.
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

    // Check for session initialization boundaries
    if (trimmed.startsWith('-- MindDiff: Starting')) {
      commitSegment();
      currentSource = 'system';
      currentType = 'session_start';
      segmentStartIdx = currentIdx;
      currentSegmentLines.push(line);
    } 
    // Check for shell command execution boundaries
    else if (trimmed.startsWith('$ ') || (trimmed.startsWith('>') && !trimmed.startsWith('>>'))) {
      commitSegment();
      currentSource = 'user';
      currentType = 'command_execution';
      segmentStartIdx = currentIdx;
      currentSegmentLines.push(line);
    } 
    // Check for runtime errors, warnings, or compiler crash cues
    else if (
      trimmed.includes('Error:') || 
      trimmed.includes('Exception:') || 
      trimmed.includes('FAILED') || 
      trimmed.includes('Linter Error')
    ) {
      commitSegment();
      currentSource = 'system';
      currentType = 'error_observation';
      segmentStartIdx = currentIdx;
      currentSegmentLines.push(line);
    } 
    // General accumulation block
    else {
      if (currentSegmentLines.length === 0) {
        segmentStartIdx = currentIdx;
        currentSource = 'agent';
        currentType = 'thought';
      }
      currentSegmentLines.push(line);
    }
    
    // Accumulate running character index length (+1 for newline character)
    currentIdx += line.length + 1;
  }
  
  commitSegment();
  return segments;
}
