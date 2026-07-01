# MindDiff

> Preserving cognitive traces alongside repository evolution.

MindDiff is a **Developer Continuity Engine** for AI-assisted and terminal-heavy engineering workflows. It captures the session around a change, preserves the reasoning and constraints behind it, and links that context back to the Git history you already trust.

MindDiff does **not** replace Git. Git remains the canonical record of code state. MindDiff adds the missing continuity layer: the prompts, failed attempts, debugging loops, tool output, and architectural reasoning that usually disappear once a commit lands.

---

## Why MindDiff exists

### 1. Generation is accelerating faster than comprehension

AI tools have dramatically increased how fast code can be generated. Human understanding has not accelerated at the same rate. Teams still need to maintain, debug, review, and extend systems long after the original session is over.

**Generation speed != comprehension speed.**

### 2. Git alone is insufficient for engineering memory

Git is excellent at preserving **what changed**: snapshots, chronology, diffs, merges, and branches.

But Git only stores the **outcome** of reasoning. It usually loses:

- the exploratory paths that did not work
- the linter or compiler constraints that shaped the final solution
- the intent behind a refactor
- the reasoning thread connecting multiple commits in one session

MindDiff complements Git by attaching those cognitive traces to the repository's actual evolution.

### 3. The product promise: Remember. Understand. Continue.

- **Remember accurately** with high-fidelity PTY capture and transcript reconstruction
- **Understand what mattered** by compiling logs into semantic memories, episodes, and handoffs
- **Continue without reloading everything** by revisiting a session, a commit, or the latest continuity state

---

## What MindDiff gives you

- **Captured sessions** for AI agents or arbitrary CLI workflows
- **Commit-linked context** so `minddiff commit <sha>` can explain why a change happened
- **Narrative session views** that group low-level terminal activity into meaningful goal episodes
- **Compiled memories and handoffs** for resuming work without starting from zero
- **Local-first project history** stored inside `.minddiff/`

---

## Getting started

### Install

```bash
npm install -g minddiff
```

### Quick start

```bash
# 1. Initialize MindDiff in your repository
minddiff init

# 2. Start a captured engineering session
minddiff run gemini

# 3. Work and commit normally
git commit -m "Refactor parser logic"

# 4. Revisit the reasoning behind that commit
minddiff commit HEAD
```

If you prefer a guided experience, run `minddiff` with no arguments to open the interactive terminal dashboard.

---

## Two ways to work

### Interactive launcher

```bash
minddiff
```

Open a keyboard-driven terminal dashboard to launch commands, browse history, read help, and explore project context interactively.

### Direct CLI

```bash
minddiff history
minddiff commit <sha>
```

Use direct commands when you want speed, scripts, or a more traditional CLI workflow.

---

## Core commands

| Command | Purpose |
| --- | --- |
| `minddiff` | Open the interactive launcher dashboard |
| `minddiff init` | Initialize `.minddiff/` and install Git hooks |
| `minddiff run <agent> [args...]` | Capture an agent or arbitrary CLI command in a PTY session |
| `minddiff status` | Show active sessions and process details |
| `minddiff watch` | Tail the active session's live output |
| `minddiff history` | Browse recorded sessions |
| `minddiff view <session-id>` | Read the narrative story of a session |
| `minddiff log <session-id>` | Print the reconstructed clean transcript |
| `minddiff commit <sha>` | Explain why a commit happened |
| `minddiff memories [--tag <tag>]` | Browse compiled memories across sessions |
| `minddiff sync` | Synchronize commits with recorded sessions |
| `minddiff help [command]` | Show manuals and command-specific help |

### Examples

```bash
minddiff run gemini
minddiff run npm test
minddiff view session-2026-06-30-qqc5
minddiff view session-2026-06-30-qqc5 --raw
minddiff view session-2026-06-30-qqc5 --json
minddiff log session-2026-06-30-qqc5
minddiff memories --tag debugging
```

---

## How it fits with Git

MindDiff treats Git as the canonical timeline of code changes and augments it with session continuity:

- one session can span multiple commits
- one commit can be linked back to the active session that produced it
- post-commit synchronization keeps commit metadata and session metadata aligned

That means your repository keeps its normal Git workflow while gaining an inspectable memory layer.

---

## Documentation

- **Contributor & Maintainer Handbook**: [`docs/developer.md`](./docs/developer.md)
- **Architecture Guide**: [`docs/architecture.md`](./docs/architecture.md)

---

## Project links

- **Project Homepage**: [noisyarchitects.org/projects/minddiff](https://noisyarchitects.org/projects/minddiff)
- **npm Registry**: [npmjs.com/package/minddiff](https://www.npmjs.com/package/minddiff)
- **GitHub Repository**: [github.com/NoisyArchitects/minddiff](https://github.com/NoisyArchitects/minddiff)
