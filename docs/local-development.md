# MindDiff Local Development Guide

This guide is for contributors actively developing MindDiff locally. It covers how to set up, run, test, and validate your changes.

---

## 1. Initial Setup & Bootstrapping

### Step 1: Install Dependencies
Install packages:
```bash
npm install
```

### Step 2: macOS ARM64 `node-pty` Permissions Fix
If you are developing on macOS (especially Apple Silicon/arm64) and see a `posix_spawnp failed` crash when spawning processes, the `node-pty` spawn-helper binary lacks execution permissions.

Fix it by running:
```bash
chmod +x node_modules/node-pty/prebuilds/darwin-arm64/spawn-helper
```

### Step 3: Initialize MindDiff in the Repository
Run the initialization command to set up the local `.minddiff` state files and register Git hooks locally:
```bash
npm run dev -- init
```
**Verification:**
* Verify that a `.minddiff/` directory has been created in your workspace.
* Verify that `.git/hooks/post-commit` contains the `minddiff sync` command.

---

## 2. Daily Development Workflow

### How to Run Commands in Development
You can run any CLI command using `tsx` (without a manual rebuild step) via the `dev` script:
```bash
npm run dev -- <command> [args...]
```

### Testing Agents under MindDiff Wrapping
To test how MindDiff intercepts and logs agent runs, execute:
```bash
# Wrap a default agent like gemini, claude, aider, or copilot
npm run dev -- run gemini

# Wrap any arbitrary command or other agent (e.g. agy, node)
npm run dev -- run agy --version
```

### Watching Live Logs
To watch the active log stream from the latest session in real-time, open a new terminal window and run:
```bash
npm run dev -- watch
```

### Navigating Development History
MindDiff provides commands to explore captured sessions, compiled memories, and associated Git commits:
* **Check active sessions and recent summary:**
  ```bash
  npm run dev -- status
  ```
* **List chronological history of developer sessions:**
  ```bash
  npm run dev -- history
  ```
* **Inspect details and memories of a session:**
  ```bash
  npm run dev -- view <session-id> # (or open <session-id>)
  ```
* **View the human-sanitized transcript (ANSI codes stripped):**
  ```bash
  npm run dev -- log [session-id]
  ```
* **View the session context and memories behind a Git commit:**
  ```bash
  npm run dev -- commit <sha>
  ```
* **Browse chronological compiled memories across all sessions:**
  ```bash
  npm run dev -- memories [--tag <tag>]
  ```

### Building & Running Production Binaries
To build the project into JavaScript (`dist/`) and verify compile correctness:
```bash
npm run build
```
Once built, you can run the compiled binary directly:
```bash
node dist/cli.js <command>
```

---

## 3. Inspecting & Verifying State

All local session state, raw logs, and compiled memories are stored in the `.minddiff/` directory.

### Directory Layout
```
.minddiff/
├── state.json          # List of active sessions and their running process PIDs
├── sessions/
│   ├── session-*.log         # Raw stdout and stderr stream captured from the agent
│   ├── session-*.json        # Session metadata (timestamp, agent name, linked commits)
│   └── session-*.memory.json # Compiled cognitive memory ledger
└── commits/
    └── [sha].json            # Commit details mapping to associated sessions
```

### How to Verify Compiled Memory (`memory.json`)
When an agent session finishes (or crashes), the memory compiler automatically parses the raw log and creates a `session-*.memory.json` file.
1. Open `.minddiff/sessions/` and find the latest `session-*.memory.json`.
2. Inspect the file to ensure the structure contains:
   * `compilerVersion` and `schemaVersion`
   * `memories`: An array of captured actions containing `source` (e.g., `user`, `agent`), `observed` properties (action, type, summary), and `inferred` cognitive details (intent, tags, confidence score).
3. Verify that tags (like `planning`, `debugging`, `code_edit`, `repository_search`) are properly inferred based on what commands the agent executed in the raw log.

### How to Verify Git Hook Synchronization
MindDiff links commits made during a session back to that session's log.
1. Start an agent session (e.g., `npm run dev -- run gemini`).
2. Make code edits and commit them using Git (`git commit -m "Test commit"`).
3. The post-commit hook will fire, running `minddiff sync` automatically.
4. Verify synchronization by checking:
   * `.minddiff/commits/[sha].json` exists and includes the active session ID.
   * `.minddiff/sessions/session-*.json` has the commit SHA added to its `"commits"` array.
5. If you are not using Git or want to trigger synchronization manually:
   ```bash
   npm run dev -- sync
   ```
   *Note: If there are uncommitted changes in the Git working tree, the interactive manual `sync` command will prompt you to confirm before proceeding. This prevents accidental association of active work with an older commit.*

---

## 4. Common Troubleshooting & Debugging

### Stale Sessions / Sealed Sessions
If a process crashes or is forcefully terminated, the session may remain marked as active.
* Run a manual sync command to scan active sessions, detect dead PIDs, and clean them:
  ```bash
  npm run dev -- sync
  ```
  *(MindDiff will output: `-- MindDiff: Sealed orphaned session session-* --`)*

### Stale Lock Files
If a lock error happens (e.g., database write contention), check if a stale lock file was left behind:
* Remove `.minddiff/state.json.lock` if it persists after a process has terminated.
