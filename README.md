# MindDiff

> Preserving cognitive traces alongside repository evolution.

**Status:** *Experimental Exploration. This is an active systems and tooling experiment investigating how to preserve cognitive continuity and observability during AI-assisted engineering.*

---

## The Bottleneck: Generation vs. Comprehension

Modern AI coding tools dramatically increase code generation speed. They rapidly synthesize architecture, business logic, debugging fixes, refactors, and large implementations.

But human comprehension, memory, and reasoning continuity do not scale at the same speed. Developers remain responsible for understanding the code, debugging it, safely modifying it, maintaining production systems, and reasoning about architectural decisions weeks or months later.

This creates a new engineering bottleneck:

**Generation speed ≠ comprehension speed.**

The real problem is that AI-generated reasoning evaporates faster than Git can preserve it.

## Why Git Alone is Insufficient

Git is the source of truth for repository evolution. It perfectly solves:
- Code state
- Chronology
- Branching and merging
- Snapshots

However, Git tracks the *outcome* of reasoning, not the reasoning itself. In an AI-native workflow, much of the exploratory context, debugging logic, and architectural rationale is generated in ephemeral chat contexts or temporary logs, which are lost once the code is committed.

MindDiff **does not replace Git.** It exists to augment it, preserving cognitive traces alongside repository evolution.

## What MindDiff Is

MindDiff is an observability and continuity layer around AI-assisted engineering workflows.

Originally conceptualized as a static logging system, MindDiff has evolved into an active runtime wrapper around AI terminal workflows. It observes AI-native engineering sessions in real time by wrapping the underlying CLI tools, capturing the live terminal byte stream, and preserving it locally within the repository.

MindDiff does not generate intelligence, replace your IDE, or act as an agent framework. It simply captures, timestamps, attaches context, and preserves existing reasoning traces.

Crucially, these logs evolve *with* the repository:
- Logs live inside the repository (`.minddiff/sessions/`).
- Logs are committed with code.
- Branches naturally fork cognition.
- Merges naturally merge cognition.
- Deleted branches naturally remove abandoned exploration paths.

## Runtime Wrapper Architecture

MindDiff operates by wrapping AI CLI tools (like Gemini CLI) in a pseudo-terminal (PTY) using `node-pty`. This architecture allows it to:
- Preserve the native interactive terminal UX (colors, prompts, screen clearing).
- Intercept the live `stdout` and `stderr` byte streams.
- Append the session stream to local repo-native logs.
- Expose the stream for passive live observation from another terminal.

## How It Currently Works

1. **Initialization:** Run `minddiff init` to set up `.minddiff` and configure the Git post-commit hook.
2. **Launch:** Run your AI CLI agent wrapped under MindDiff (e.g. `minddiff run gemini` or `minddiff run claude`).
3. **Passthrough:** MindDiff allocates a PTY, spawns the target agent CLI, and pipes your input and its output transparently. You interact with the AI exactly as you normally would.
4. **Interception:** As the session progresses, MindDiff tees the raw PTY stream to a timestamped, append-only log file in the `.minddiff/sessions/` directory.
5. **Observation:** A separate terminal can tail this stream using the `watch` command, allowing developers to observe the AI's cognitive process in real time.

## Example Workflow

The architecture enables a powerful separation of concerns during complex engineering tasks:

```bash
# Terminal 1 (The Driver): Start an active AI engineering session
npm run dev -- run gemini

# Terminal 2 (The Observer): Passively watch the cognition stream evolve
npm run dev -- watch
```

In this setup, Terminal 1 drives the active session, while Terminal 2 passively observes the cognition stream's evolution. This allows for real-time review and monitoring without interrupting the active prompt interface.

## Current Commands

- `minddiff init`: Initializes the `.minddiff` database and configures Git post-commit hooks.
- `minddiff run <agent> [args]`: Wraps the given CLI agent in a PTY, intercepting and logging the session to `.minddiff/sessions/`.
- `minddiff sync`: Synchronizes any pending commits with active sessions (automated via post-commit hooks).
- `minddiff watch`: Tails the most recent log file in the repository, rendering the raw PTY stream (including ANSI escape codes) for live observability.

## PTY, Watch, and Terminal Reality

By utilizing a PTY, MindDiff ensures that the underlying AI tool believes it is attached to a real terminal. This is critical for tools that rely on interactive prompts or rich terminal UIs. The intercepted stream includes all ANSI escape codes, cursor movements, and rendering commands.

The `watch` command leverages this by reading the raw byte stream from the log file and writing it directly to standard output. This effectively replays the terminal state, allowing you to observe the UI and reasoning process exactly as it appeared to the primary user, updating in real time as new bytes are appended.

## Design Philosophy

The system is intentionally simple, terminal-native, and adheres to strict constraints:
- **Repo-native:** Lives alongside your code.
- **Git-compatible:** Leverages your existing VCS.
- **Local-first:** No cloud dependency required to read your own project history.
- **Append-only:** Traces are written and preserved, not retroactively polished.
- **Terminal-native:** Respects standard Unix streams and terminal semantics.
- **Unmodified Preservation:** Preserves the AI’s original output stream as much as possible instead of heavily transforming or interpreting it.

## Raw Stream ≠ Semantic Cognition

A critical discovery in this evolution is that the terminal protocol (ANSI redraws, PTY rendering, cursor movements) is distinct from the semantic reasoning layer. 

MindDiff currently captures terminal reality before interpretation.

This is a deliberate architectural choice. Before attempting to build complex parsers, semantic extractors, or "smart" summaries, the system prioritizes a robust, high-fidelity source of truth. Every UI rendering, every backspace, and every reasoning trace is captured exactly as it occurred in the terminal.

## Current Limitations

- **Raw ANSI Streams:** Because the logs store the raw PTTY byte stream, they are optimal for terminal replay (`watch`) but difficult to read in standard Markdown viewers due to the presence of ANSI escape codes.
- **Platform Support:** The PTY implementation (`node-pty`) can be environmentally sensitive, particularly on ARM architectures.
- **No Semantic Extraction:** The system does not yet parse the raw stream to extract clean, semantic Markdown summaries.

## Future Exploration Areas

- **Semantic Extraction:** Building parsers to separate the terminal rendering layer from the semantic layer, extracting clean Markdown reasoning summaries without losing the original fidelity.
- **Context Mapping:** Exploring how to intuitively map historical cognitive traces to the evolving file structure (e.g., when a file is renamed or refactored).
- **Trigger Mechanisms:** Identifying the most frictionless ways to start and stop logging contexts during complex workflows.

---
*MindDiff is a continued exploration into building resilient human-AI engineering workflows.*
