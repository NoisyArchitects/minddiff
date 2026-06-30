/**
 * Pass 2: Sanitization & Cleaning
 * Strips ANSI escape sequences and other control codes from the text.
 */
export function cleanTerminalText(text: string): string {
  // Standard regex to match ANSI escape sequences (colors, cursors, styling)
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
  let cleaned = text.replace(ansiRegex, '');

  // Strip remaining control characters except tab and newline
  const controlCharsRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;
  cleaned = cleaned.replace(controlCharsRegex, '');

  return cleaned;
}
