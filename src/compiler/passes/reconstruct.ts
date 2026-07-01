export interface TerminalCell {
  char: string;
  width: number;
}

export class TerminalLine {
  public cells: TerminalCell[] = [];

  public writeAt(x: number, char: string, width: number) {
    // Pad line with spaces if writing beyond active length
    while (this.cells.length < x) {
      this.cells.push({ char: ' ', width: 1 });
    }
    
    this.cells[x] = { char, width };

    // Pad multi-column character cells (CJK / Emojis) with empty placeholders
    if (width > 1) {
      for (let w = 1; w < width; w++) {
        this.cells[x + w] = { char: '', width: 0 };
      }
    }
  }

  // Clear line from cursor position to the right (ANSI code: \u001b[K or \u001b[0K)
  public clearFrom(x: number) {
    if (x < this.cells.length) {
      this.cells.length = x;
    }
  }

  public toString(): string {
    return this.cells
      .filter(cell => cell.width > 0)
      .map(cell => cell.char)
      .join('')
      .trimEnd();
  }
}

/**
 * Pass 1: Terminal Reconstruction
 * Reconstructs clean text lines by processing carriage returns (\r), backspaces (\b),
 * cursor movements, and clearing operations.
 */
export function reconstructTerminal(rawLog: string): string {
  const lines: TerminalLine[] = [new TerminalLine()];
  let cursorX = 0;
  let cursorY = 0;
  let inAltBuffer = false;

  let i = 0;
  while (i < rawLog.length) {
    const char = rawLog[i];

    // 1. Process ANSI Escape Sequences (CSI) first to catch state changes
    if (char === '\u001b') {
      const match = rawLog.slice(i).match(/^\u001b\[([0-9;?]*)([A-Za-z])/);
      if (match) {
        const params = match[1];
        const cmd = match[2];
        i += match[0].length;

        const val = parseInt(params) || 1;

        if (cmd === 'A') { // Cursor Up
          cursorY = Math.max(0, cursorY - val);
        } else if (cmd === 'B') { // Cursor Down
          cursorY += val;
          while (lines.length <= cursorY) lines.push(new TerminalLine());
        } else if (cmd === 'C') { // Cursor Forward
          cursorX += val;
        } else if (cmd === 'D') { // Cursor Backward
          cursorX = Math.max(0, cursorX - val);
        } else if (cmd === 'K') { // Clear Line (K or 0K = cursor to end)
          if (params === '' || params === '0') {
            lines[cursorY].clearFrom(cursorX);
          } else if (params === '2') { // Clear entire line
            lines[cursorY].clearFrom(0);
          }
        } else if (cmd === 'h' && params === '?1049') { // Alternate Screen Buffer ON
          inAltBuffer = true;
        } else if (cmd === 'l' && params === '?1049') { // Alternate Screen Buffer OFF
          inAltBuffer = false;
        }
        continue;
      }
    }

    // 2. If in Alternate Screen Buffer, completely ignore all other inputs
    if (inAltBuffer) {
      i++;
      continue;
    }

    // 3. Process normal output controls and characters
    if (char === '\r') {
      cursorX = 0;
      i++;
      continue;
    }

    if (char === '\n') {
      cursorY++;
      if (!lines[cursorY]) lines[cursorY] = new TerminalLine();
      cursorX = 0;
      i++;
      continue;
    }

    if (char === '\b') {
      cursorX = Math.max(0, cursorX - 1);
      i++;
      continue;
    }

    // Write character
    const width = getCharacterWidth(char);
    lines[cursorY].writeAt(cursorX, char, width);
    cursorX += width;
    i++;
  }

  return lines.map(line => line.toString()).join('\n');
}

function getCharacterWidth(char: string): number {
  const codePoint = char.codePointAt(0);
  if (!codePoint) return 1;
  // Basic emoji / CJK ranges for cell alignment
  if (codePoint >= 0x4e00 && codePoint <= 0x9fff) return 2; // CJK
  if (codePoint >= 0x1f300 && codePoint <= 0x1f9ff) return 2; // Emojis
  return 1;
}
