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

## Git & `.gitignore` Policy
The `.minddiff/` directory contains both **shared** and **local-only** data. Agents must never add `.minddiff/` as a blanket ignore.

### MUST be tracked in git (shared with the team)
| Path | Why |
|------|-----|
| `.minddiff/commits/*.json` | Commit → session bindings. Powers `minddiff commit <sha>` for all team members. |
| `.minddiff/sessions/*.json` | Session metadata (agent, timestamps, running status). |
| `.minddiff/sessions/*.memory.json` | Compiled semantic episodes — the core value of MindDiff. |
| `.minddiff/sessions/*.handoff.json` | Session continuity context. |
| `.minddiff/sessions/*.handoff.md` | Human-readable session handoff. |
| `.minddiff/config/` | Shared project-level MindDiff configuration. |

### MUST be ignored in `.gitignore` (local-only)
| Pattern | Why |
|---------|-----|
| `.minddiff/sessions/*.log` | Raw PTY terminal dumps. Can be 100MB+. Only needed locally for recompilation. |
| `.minddiff/state.json` | Runtime lock state for active sessions. |
| `.minddiff/state.json.lock` | File lock. |
