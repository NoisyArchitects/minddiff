function supports256Colors(): boolean {
  const env = process.env;
  if (env.FORCE_COLOR !== undefined) {
    return env.FORCE_COLOR !== '0';
  }
  if (env.COLORTERM === 'truecolor' || env.COLORTERM === '256color') {
    return true;
  }
  if (env.TERM && (env.TERM.includes('256') || env.TERM.includes('color'))) {
    return true;
  }
  return false;
}

const use256 = supports256Colors();

export const theme = {
  accent: (text: string) => use256 ? `\x1b[38;5;160m${text}\x1b[0m` : `\x1b[31m${text}\x1b[0m`,    // Warm Cherry Red
  highlight: (text: string) => use256 ? `\x1b[38;5;209m${text}\x1b[0m` : `\x1b[95m${text}\x1b[0m`, // Soft Coral
  warning: (text: string) => use256 ? `\x1b[38;5;214m${text}\x1b[0m` : `\x1b[33m${text}\x1b[0m`,   // Amber
  success: (text: string) => use256 ? `\x1b[38;5;71m${text}\x1b[0m` : `\x1b[32m${text}\x1b[0m`,    // Muted Green
  bold: (text: string) => `\x1b[1m${text}\x1b[0m`,
  dim: (text: string) => `\x1b[2m${text}\x1b[0m`,
  italic: (text: string) => `\x1b[3m${text}\x1b[0m`,
};
