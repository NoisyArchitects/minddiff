# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.2] - 2026-07-01

### Fixed
- **Launcher Keypress Leak**: Fixed a critical P0 bug where the interactive dashboard's input listener was not removed upon transferring control to subcommands. This prevents keystrokes typed during agent execution (such as Antigravity) from leaking into the dashboard handler and causing terminal screen corruption.
- **Circular Dependency**: Decoupled the interactive launcher loop from direct command execution by transitioning to a Promise-based subcommand resolution architecture.

## [1.1.1] - 2026-07-01

### Added
- **Git-First Onboarding**: Implemented Git detection, Git explanation, and automatic prompt to initialize Git when running in a fresh workspace without Git.
- **Auto-Initialization**: Configured automatic `.minddiff` database setup, Git hooks installation, and agent picker startup immediately following Git initialization.
- **Developer Handbook**: Created `docs/developer.md` detailing the codebase structure, developer workflows, testing instructions, and maintenance procedures.
- **Maintainer Tooling**: Added a dynamic dev link manager (`scripts/link-dev.js` and `scripts/unlink-dev.js` exposed as `npm run link-dev` and `npm run unlink-dev`) to streamline local development testing.

### Changed
- **CLI Flags**: Standardized `-v` / `--version` and `-h` / `--help` flags at both the root level and within individual subcommands for better POSIX CLI standards.
- **Visual Identity**: Transitioned the accent color from magenta to a warmer, highly readable cherry/crimson red (`\x1b[38;5;160m`) optimized for both light and dark terminals.
- **UX Polish**: Cleaned up the agent picker in the home dashboard to render unselected installed agents in default terminal white instead of green, highlighting selections clearly.
- **Version Banner**: Standardized version checking output to display the `minddiff` name in the new cherry red accent style.
- **Interactive Prompts**: Refined prompts and messages to be more user-friendly and consistent across interactive prompts.

## [1.1.0] - 2026-07-01

### Added
- **Interactive Terminal Launcher**: Launching `minddiff` with no arguments opens an interactive terminal dashboard. Navigate commands, tutorials, help references, and about specs using standard arrow keys (`←`/`→`/`↑`/`↓`).
- **Interactive Command Wizards**: Launching commands from the dashboard prompts you for inputs (such as choosing an agent, selecting past session IDs, or entering Git SHAs) directly within the dashboard.
- **Narrative Story View**: The `minddiff view <session-id>` command now groups granular timeline logs into logical **Semantic Episodes** (Intent -> Actions -> Outcome -> Reflection) to render a clean, visual story of your session.
- **Session Handoff Generator**: Handoff summaries (`session-<id>.handoff.md` and `.handoff.json`) are automatically created when a session finishes, summarizing what was accomplished, what is left unfinished, active files, and blockers.
- **Subcommand Documentation**: Query detailed command reference manuals directly in your shell using `minddiff help <command>` (e.g. `minddiff help run`).
- **Headless Terminal Fallback**: Configured automatic fallback from the interactive dashboard to a clean, static command palette when running in non-TTY (non-interactive) shells.

### Changed
- **Direct CLI view modes**: Added `--raw` and `--json` flags to `view` command, allowing developers to retrieve raw database events or raw JSON outputs when scripting.

### Internal
- **Three-Layer Architecture**: Restructured compiler pipelines into three modular, decoupled layers (Reconstructor, Memory Compiler, and Memory Explorer) to isolate stream decoding from fact tagging and episode projection.
- **Unified Dispatcher**: Extracted command execution routing into a single dispatcher shared identically by the CLI parser and the dashboard launcher to prevent duplicate logic.

## [1.0.1-alpha.2] - 2026-06-29

### Added
- **OIDC GitHub Actions pipeline**: Configured trusted publishing to npm securely via OpenID Connect (OIDC) authentication, eliminating long-lived npm secrets.
- **`.minddiff/` Storage Database**: Transitioned repository cognitive tracing from `/minddiff/logs` to a local, structured database layout (`.minddiff/` containing `sessions/`, `commits/`, `summaries/`, `index/`, `config/`).
- **Deterministic Git Synchronization**: Added synchronization logic linking Git commits to corresponding agent sessions. Supported one-to-many associations (one session spanning multiple commits) via `.minddiff/state.json` and reciprocal JSON metadata cross-referencing.
- **Multi-Agent Runtime Adapter**: Decoupled the PTY spawning wrapper from Gemini by introducing the `Agent` interface and PTYAgent adapters (`gemini`, `claude`, `copilot`, `aider`, or dynamic command execution).
- **Explicit Project Initialization (`minddiff init`)**: Added an explicit workspace setup command (`init`) to setup folders and Git hooks.
- **Concurrency & File Locking Mutex**: Resolved race conditions on concurrent multi-agent executions by implementing a state file mutex via atomic lock files (`state.json.lock`).
- **Crash Recovery & Orphan Sealing**: Added PID tracking and process liveness checks (`isPidAlive()`) to automatically self-heal and seal orphaned crashed sessions upon next CLI sync.
- **Documentation Overhaul**: Created a detailed architecture guide `docs/architecture.md` and updated `README.md` and `GEMINI.md`.

### Fixed
- Fixed Node event loop hang on natural process exit by pausing standard input streams on PTY command termination.
