const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const globalPrefix = execSync('npm prefix -g', { encoding: 'utf8' }).trim();
  const isWindows = process.platform === 'win32';
  const binDir = isWindows ? globalPrefix : path.join(globalPrefix, 'bin');
  
  const linkName = isWindows ? 'minddiff-dev.cmd' : 'minddiff-dev';
  const target = path.join(binDir, linkName);
  const source = path.resolve(__dirname, '..', 'dist', 'cli.js');

  // Verify build exists
  if (!fs.existsSync(source)) {
    console.error('\nError: Build files not found in dist/. Please run "npm run build" first.\n');
    process.exit(1);
  }

  // Ensure bin directory exists
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  // Remove existing link
  if (fs.existsSync(target)) {
    fs.unlinkSync(target);
  }

  if (isWindows) {
    const cmdContent = `@ECHO OFF\nnode "${source}" %*`;
    fs.writeFileSync(target, cmdContent, 'utf8');
  } else {
    fs.symlinkSync(source, target);
    fs.chmodSync(target, 0o755);
  }

  console.log('\n✓ Linked development binary\n');
  console.log(`  minddiff-dev -> ${source}\n`);
  console.log('You can now run:\n');
  console.log('  minddiff-dev\n');
  console.log('Your published npm installation remains available as:\n');
  console.log('  minddiff\n');
} catch (err) {
  console.error('Failed to link development binary:', err.message);
  process.exit(1);
}
