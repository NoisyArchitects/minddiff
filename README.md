# MindDiff

> Preserving cognitive traces alongside repository evolution.

MindDiff is a **Developer Continuity Engine** designed to capture, structure, and preserve the reasoning context behind code changes. It acts as an observability layer, bridging the gap between code outcomes (Git commits) and the developer thoughts, debugging loops, and linter constraints that produced them.

---

## Why MindDiff?

### 1. Generation vs. Comprehension
AI coding tools dramatically increase code creation speed. But human comprehension, memory, and reasoning continuity do not scale at the same rate. Developers remain responsible for understanding and maintaining systems weeks or months later. **Generation speed ≠ comprehension speed.**

### 2. Git Tracks the "What", MindDiff Tracks the "Why"
Git is the canonical source of truth for code snapshots, chronology, and branching. However, Git only records the *outcome* of reasoning. The exploratory paths, failed compiler attempts, and architectural rationales are lost once the code is committed. MindDiff does not replace Git—it enriches it by attaching cognitive timelines directly to your repository's Git commits.

---

## Twin Workflows

MindDiff is designed to fit your preferred workflow:

1. **Interactive Launcher (Recommended)**
   Simply run:
   ```bash
   minddiff
   ```
   Open a keyboard-navigated dashboard to launch commands, browse session history, read guides, and explore references directly.

2. **Direct CLI**
   Run commands directly for speed or CI scripting:
   ```bash
   minddiff history
   # or
   minddiff commit <sha>
   ```

---

## Core Workflow

Using MindDiff is simple and requires zero change to your daily Git commands:

```bash
# Step 1: Initialize MindDiff in your project root (installs Git hooks)
minddiff init

# Step 2: Start an active engineering session under capture
minddiff run gemini  # (or claude, aider, or npm test)

# Step 3: Write code, run tests, and commit normally
git commit -m "Refactor parser logic"

# Step 4: Revisit the context behind the commit later
minddiff commit HEAD
```

---

## Command Reference

### `minddiff`
Opens the interactive terminal launcher dashboard (Commands, Tutorials, Help, and About tabs). Fallbacks to static help in non-interactive (non-TTY) shells.
```bash
minddiff
```

### `minddiff init`
Initializes the workspace database under `.minddiff/` and registers standard Git commit hooks.
```bash
minddiff init
```

### `minddiff run <agent> [args...]`
Spawns a captured terminal wrapper wrapping the target agent or CLI command.
```bash
minddiff run gemini
minddiff run npm test
```

### `minddiff status`
Displays active capture sessions and process details.
```bash
minddiff status
```

### `minddiff watch`
Tails the live stdout log stream of the currently active capturing session.
```bash
minddiff watch
```

### `minddiff history`
Lists all previously recorded developer sessions in reverse chronological order.
```bash
minddiff history
```

### `minddiff view <session-id>`
View details of a compiled developer session. Defaults to the **Narrative Story** layout which groups terminal steps into logical goal episodes.
```bash
minddiff view session-2026-06-30-qqc5
minddiff view session-2026-06-30-qqc5 --raw   # Dumps flat MemoryBlock records
minddiff view session-2026-06-30-qqc5 --json  # Dumps raw database JSON
```

### `minddiff log <session-id>`
Prints the reconstructed, fully-cleaned, raw text log of a session (ANSI styling and carriage returns resolved).
```bash
minddiff log session-2026-06-30-qqc5
```

### `minddiff commit <commit-sha>`
Explains why a Git commit happened by checking its linked sessions, linter constraints, and developer goals.
```bash
minddiff commit e8a12f9
```

### `minddiff memories`
Browses a consolidated chronological timeline of all compiled developer facts and tag tags.
```bash
minddiff memories
minddiff memories --tag debugging
```

### `minddiff sync`
Manually scans and synchronizes offline Git commits with recorded sessions.
```bash
minddiff sync
```

### `minddiff help [command]`
Displays the main help documentation or command-specific manuals.
```bash
minddiff help
minddiff help run
```

---

## Project Links

* **Project Homepage**: [noisyarchitects.org/projects/minddiff](https://noisyarchitects.org/projects/minddiff)
* **npm Registry**: [npmjs.com/package/minddiff](https://www.npmjs.com/package/minddiff)
* **GitHub Repository**: [github.com/NoisyArchitects/minddiff](https://github.com/NoisyArchitects/minddiff)

---

## Contributing & Development

We welcome contributions! To set up, compile, and run MindDiff locally in development mode, please read our contributor guide:

👉 [docs/local-development.md](file:///Users/rish/Desktop/DEV/NoisyArchitects/minddiff/docs/local-development.md)
