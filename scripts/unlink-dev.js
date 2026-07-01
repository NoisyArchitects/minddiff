const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const globalPrefix = execSync('npm prefix -g', { encoding: 'utf8' }).trim();
  const isWindows = process.platform === 'win32';
  const binDir = isWindows ? globalPrefix : path.join(globalPrefix, 'bin');
  
  const linkName = isWindows ? 'minddiff-dev.cmd' : 'minddiff-dev';
  const target = path.join(binDir, linkName);

  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
    console.log(`\n✓ Unlinked development binary successfully: ${target}\n`);
  } else {
    console.log('\nDevelopment binary link not found or already unlinked.\n');
  }
} catch (err) {
  console.error('Failed to unlink development binary:', err.message);
  process.exit(1);
}
