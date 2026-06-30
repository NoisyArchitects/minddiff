/**
 * Pass 1: Terminal Reconstruction
 * Reconstructs clean text lines by processing carriage returns (\r) and backspaces (\b).
 */
export function reconstructTerminal(rawLog: string): string {
  const lines = rawLog.split(/\r?\n/);
  const processedLines: string[] = [];

  for (const line of lines) {
    const chars: string[] = [];
    let cursor = 0;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '\r') {
        cursor = 0;
      } else if (char === '\b') {
        if (cursor > 0) {
          cursor--;
        }
      } else {
        chars[cursor] = char;
        cursor++;
      }
    }
    
    // Stitch chars array together, replacing any uninitialized positions with space
    const cleanedLine = [];
    for (let i = 0; i < chars.length; i++) {
      cleanedLine.push(chars[i] === undefined ? ' ' : chars[i]);
    }
    processedLines.push(cleanedLine.join(''));
  }

  return processedLines.join('\n');
}
