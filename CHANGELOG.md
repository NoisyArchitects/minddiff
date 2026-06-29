# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
