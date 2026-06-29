const fs = require('fs');
const path = require('path');

try {
  const ptyPath = require.resolve('node-pty');
  const ptyRoot = path.dirname(path.dirname(ptyPath));
  const helperPaths = [
    path.join(ptyRoot, 'build', 'Release', 'spawn-helper'),
    path.join(ptyRoot, 'build', 'Debug', 'spawn-helper'),
    path.join(ptyRoot, 'prebuilds', `${process.platform}-${process.arch}`, 'spawn-helper')
  ];

  for (const p of helperPaths) {
    if (fs.existsSync(p)) {
      try {
        fs.chmodSync(p, 0o755);
        console.log(`MindDiff: Restored execute permissions on: ${p}`);
      } catch (err) {
        console.warn(`MindDiff Warning: Could not chmod ${p}:`, err.message);
      }
    }
  }
} catch (e) {
  // Ignore if node-pty is not installed yet
}
