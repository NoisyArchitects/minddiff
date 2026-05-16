# MindDiff

> Preserving cognitive traces alongside repository evolution.

**Status:** *Experimental Exploration. This is not a finalized product, but an ongoing investigation into preserving cognitive continuity during AI-assisted engineering.*

---

## The Bottleneck: Generation vs. Comprehension

Modern AI coding tools dramatically increase code generation speed. They can rapidly synthesize architecture, business logic, debugging fixes, refactors, and large implementations.

But human comprehension, memory, and reasoning continuity do not scale at the same speed. Developers are still responsible for understanding the code, debugging it, safely modifying it, maintaining production systems, and reasoning about architectural decisions weeks or months later.

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

MindDiff is an exploratory system for cognitive state preservation during AI-assisted engineering.

It recognizes that AI systems already output valuable artifacts: implementation summaries, reasoning, debugging explanations, architectural decisions, and change rationales. MindDiff simply captures, timestamps, attaches Git context, and preserves these reasoning traces.

Importantly, MindDiff logs evolve *with* the repository:
- Logs live inside the repository.
- Logs are committed with code.
- Branches naturally fork cognition.
- Merges naturally merge cognition.
- Deleted branches naturally remove abandoned exploration paths.

This ensures strict continuity between implementation evolution and reasoning evolution.

## What MindDiff is NOT

- **Not Documentation:** Documentation attempts to become polished, canonical, curated, and stable. Cognitive traces are temporal, contextual, partial, exploratory, sometimes wrong, but still valuable later.
- **Not an AI Wrapper/IDE:** MindDiff does not try to be your editor or a new platform.
- **Not an "AI Operating System":** There are no heavy abstractions.
- **Not Generating Intelligence:** MindDiff preserves *existing* AI reasoning; it does not generate new reasoning.

## Design Philosophy

The system is intentionally simple and adheres to strict constraints to minimize friction:
- **Repo-native:** Lives alongside your code.
- **Git-compatible:** Leverages your existing VCS.
- **Local-first:** No cloud dependency required to read your own project history.
- **Append-only:** Traces are written and preserved, not retroactively polished.
- **Markdown-readable:** Plain text files that any tool can parse.
- **Low cognitive overhead:** Out of the way until you need it.
- **No vector database or heavy indexing (initially):** Simplicity over complex retrieval systems.
- **Unmodified Preservation:** Preserves the AI’s original reasoning/output as much as possible instead of heavily transforming or interpreting it.

## Proposed V1 Structure

The first milestone is explicitly **not** building a platform. The goal is validating whether preserving AI reasoning alongside Git evolution meaningfully improves developer cognition and workflow continuity.

MindDiff stores raw, timestamped logs inside a dedicated directory in your repository.

```
/minddiff
  /logs
    2026-05-17T03-36-22-navbar-motion-fix.md
    2026-05-17T04-02-11-auth-routing-debug.md
```

### Why this structure?

Timestamp + slug naming helps with:
- Chronological sorting
- Human scanning
- Git diffs
- VS Code (or any editor) navigation
- Future retrieval

### Example Log Content

A single log file captures the immediate context of an AI interaction:

```markdown
---
timestamp: 2026-05-17T04:02:11Z
branch: fix/auth-routing
commit: a1b2c3d (optional)
changed_files:
  - src/middleware/auth.ts
  - src/routes/index.ts
---

# Auth Routing Debug

## Implementation Summary
Fixed a race condition in the auth middleware where the session token was evaluated before the refresh cycle completed.

## AI Reasoning
The issue occurs because `getSession()` is asynchronous, but the route guard was falling back to a cached null state if the promise didn't resolve immediately. I introduced a deterministic wait state in the router configuration to ensure the auth payload is fully hydrated.

## Risks / Open Questions
- This might introduce a minor latency spike (approx 50ms) on cold loads. We should monitor frontend routing performance metrics.
```

## Current Exploration Goals

- Validate the core hypothesis: Does preserving AI traces locally reduce cognitive load during context switching?
- Identify the minimal metadata required (timestamps, branches, file references) to make logs useful.
- Observe how developers naturally search or scan these plain-text logs during debugging.

## Open Questions

- When a file is refactored, how do we intuitively map historical cognitive traces to the new file structure without heavy indexing?
- What is the most frictionless way to trigger log creation from existing AI tooling?

---
*MindDiff is a continued exploration into building resilient human-AI engineering workflows.*
