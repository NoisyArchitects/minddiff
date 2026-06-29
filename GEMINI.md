# MindDiff Project Instructions

## Runtime & Spawning
MindDiff uses `node-pty` to wrap CLI tools. This is required to preserve interactive TTY behavior (like colors, prompts, and screen clearing) while intercepting output for logging.

### Troubleshooting `node-pty`
If you encounter `Error: posix_spawnp failed` on macOS (especially arm64), it is likely due to the `spawn-helper` binary missing execute permissions.

**Fix:**
```bash
chmod +x node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper
```

## Architecture
- **Local-first:** Logs are stored in `.minddiff/sessions/`.
- **Append-only:** Output is captured exactly as received from the PTY, including ANSI escape codes.
- **Minimal Dependencies:** Avoid adding heavy libraries for stream processing unless absolutely necessary.
