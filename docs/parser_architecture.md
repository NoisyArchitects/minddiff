# MindDiff Memory Compiler Architecture

This document defines the architectural specification for the **Memory Compiler** of MindDiff.

---

## 1. Core Philosophy & Design Principles

> **"If memory is the goal, forgetting is a first-class feature."**

MindDiff is not a terminal archiver. The raw pseudo-terminal (PTY) logs are temporary evidence. The value of MindDiff lies in the **durable knowledge** compiled from those logs. 

The Memory Compiler is analogous to a traditional compiler: it transforms an unstructured execution stream into a deterministic intermediate representation (IR) that downstream systems consume. It does not perform search, summarization, or reasoning; it produces the substrate on which those capabilities are built.

The Memory Compiler acts as a cognitive filter. Its core mandate is to decide **what deserves to be remembered** and **what should be forgotten**, turning noisy stream recordings into a structured history of developer cognition.

### Core Design Principles:
1.  **The Agent Resumption Rule**: *A future AI agent should never need to reread an entire `raw.log` to continue the project.*
2.  **Preserve Information, Not Implementation Details**: A memory should capture the cognitive results of an action, not the mechanics.
    *   *Bad Memory*: Executed `grep -R sqlite src` to scan imports.
    *   *Good Memory*: Discovered that the codebase currently imports `sqlite3` in three files.
3.  **Auditability via Evidence Links**: High-level semantic memories must link back to their exact raw execution ranges (`rawRef`) to guarantee that any downstream process can audit the compiler's conclusions.
4.  **Strict Determinism**: The Memory Compiler must be fully deterministic. Given the same raw log and the same compiler version, it must always produce identical output.
5.  **Immutability of Memories**: Once a memory block is compiled and emitted to the ledger, it is strictly immutable. If new information emerges, it must be appended or linked in downstream layers rather than editing historical records.

---

## 2. The Phased Pipeline

Rather than attempting to compile a raw character stream directly into a relational knowledge graph, MindDiff separates deterministic terminal reconstruction from cognitive extraction.

```
  Raw PTY Session (raw.log)
              ↓
    [Terminal Emulator Node]   ← (Reconstructs clean, visible stdout buffers)
              ↓
       [Memory Compiler]       ← (ANSI stripping, segmenting, tagging)
              ↓
    Chronological Ledger (memory.json)
              ↓
   [Relationship Builder]      ← (Asynchronous downstream relation builder)
              ↓
    Cognitive Graph (graph.json / edges.jsonl)
```

1.  **Raw PTY Session (`raw.log`)**: The immutable, append-only chronological byte stream containing colors, timing offsets, and cursor resets.
2.  **Terminal Emulator Node**: Headless state machine (e.g., `xterm.js` headless) that processes raw inputs to construct what was actually visible on the terminal screen at any given millisecond.
3.  **Memory Compiler**: Groups sequential stream sequences into logical segments (memories), strips terminal noise, and outputs a flat, chronological memory array.
4.  **Chronological Ledger (`memory.json`)**: A flat, append-safe chronological history of memories.
5.  **Relationship Builder**: A deferred, non-linear processor that parses `memory.json` downstream to connect independent memories into a causal graph.

---

## 3. Preserved Memory Schema (`memory.json`)

Each session's cognitive state is stored in a flat array of memory objects inside `memory.json`.

```json
{
  "compilerVersion": "1.0.0",
  "schemaVersion": "1.0.0",
  "memories": [
    {
      "id": "mem-e91b2c",
      "timestamp": "2026-06-30T13:41:00.123Z",
      "source": "agent",
      "observed": {
        "type": "tool_call",
        "action": "execute_shell_command",
        "command": "npm run test",
        "exitCode": 1,
        "summary": "Tests failed: 1 failure in auth.spec.ts"
      },
      "inferred": {
        "intent": "validate_auth_tokens",
        "tags": [
          { "name": "validation", "confidence": 0.95 },
          { "name": "error_state", "confidence": 0.88 }
        ],
        "constraints": ["Refresh token expiration logic is failing on timezone offset"]
      },
      "text": "Attempted to validate authentication refresh token tests, but timezone offset parsing caused assertion failure.",
      "rawRef": {
        "startByte": 1024,
        "endByte": 2048
      }
    }
  ]
}
```

### Schema Attributes:
*   `compilerVersion` & `schemaVersion`: Track metadata changes across compiler implementations to support deterministic reprocessing.
*   `id`: A unique, deterministic string identifier (enabling external nodes in `edges.jsonl` to reference it later without timestamp mapping).
*   `timestamp`: ISO 8601 representation of when the memory block was created.
*   `source`: The actor who generated the block (`"user"`, `"agent"`, or `"system"`).
*   `observed`: The raw, indisputable facts captured during terminal execution.
*   `inferred`: High-level cognitive attributes extracted by the compiler (goals, tags with metadata-ready objects, discovered constraints).
*   `text`: Cleaned, plain-text representation of the cognitive step.
*   `rawRef`: Start and end byte coordinates pointing back to the raw `raw.log` file. This lets downstream tools retrieve exact visual states or timing deltas lazily.

---

## 4. Observed vs. Inferred Data

MindDiff maintains a strict architectural separation between what was **observed** (ground truth) and what was **inferred** (interpretation). This is critical for AI trust and system reliability.

| Category | Definition | Examples |
| :--- | :--- | :--- |
| **Observed** | Facts literally written to stdout or read from stdin. Completely deterministic. | User keystrokes, compiler stack traces, tool payloads, process exit codes, file write ranges. |
| **Inferred** | Cognitive meaning extracted from the context. Soft, heuristic, or model-derived. | Developer intent, architectural decisions, core constraints, model thoughts, reasoning tags. |

*Downstream utility*: If an AI agent 3 weeks later doubts an `inferred` constraint, it can trace it back to the `observed` compiler output in the same memory block to confirm its validity.

---

## 5. The Memory Compiler Passes & AI Swapability

The compiler processes terminal logs sequentially through five distinct passes, providing contributors with a modular pipeline.

```
[Raw Log] ──> Pass 1: Terminal Reconstruction
                    ↓
              Pass 2: Sanitization & Cleaning
                    ↓
              Pass 3: Memory Segmentation (Swapable: Regex ──> AI)
                    ↓
              Pass 4: Cognitive Inference & Tagging (Swapable: Heuristics ──> AI)
                    ↓
[memory.json] <── Pass 5: Memory Emission
```

*   **Pass 1: Terminal Reconstruction**: Consumes raw ANSI coordinates and inputs from `raw.log`. It processes cursor movements and backspaces, outputting the clean, visible character stream.
*   **Pass 2: Sanitization & Cleaning**: Strips terminal noise (e.g., repeating compilation progress bars, spinning status indicators, command history redraws).
*   **Pass 3: Memory Segmentation**: Groups the sanitized text stream into discrete transactional spans representing logical developer tasks.
*   **Pass 4: Cognitive Inference & Tagging**: Inspects the segment contents. Extracts the `inferred` block properties (decisions, constraints, tags, and confidence scores).
*   **Pass 5: Memory Emission**: Assigns unique IDs, maps the byte offsets back to the raw log, and writes the structured block to `memory.json`.

### Future-Proofing via AI Swapability
By structuring the compiler as a multi-pass pipeline, we ensure that **Pass 3 (Segmentation)** and **Pass 4 (Inference)** can start as fast, rule-based heuristics (regex and markers) in Version 1. Later, they can be swapped for LLM-based classifiers to detect complex semantic boundaries, without changing the surrounding deterministic parser and emission logic.

---

## 6. Memory Segmentation Engine

The hardest challenge of the Memory Compiler is determining when to slice the continuous terminal stream into discrete memories. The engine manages this via three state transitions:

```
Stream Event ──> [Active Memory Block] ──> (Context Shift / Seal Trigger) ──> Emit to memory.json
```

### 1. The Start Trigger
A new memory block is initialized whenever the compiler detects a **boundary of intent**:
*   A new user prompt or command-line entry.
*   A change in the agent's internal planning block (e.g., transitioning from "investigating" to "editing").
*   The invocation of an external process (e.g., running `npm run test` or `git commit`).

### 2. The Extend Trigger
The compiler appends data to the *current active memory* as long as the inputs and outputs share the same **operational context**:
*   Consecutive tool calls reading files or searching the directory tree (grouped as a single "exploration" phase).
*   Iterative file edits within the same module hierarchy.
*   Command stdout/stderr data generated immediately following a tool invocation.
*   Temporary compilation or validation failures that the agent attempts to debug immediately.

### 3. The End/Seal Trigger
The active memory block is sealed and finalized when the compiler encounters an **intent transition**:
*   A user intervention or execution interruption (`Ctrl+C`).
*   A successful validation run (e.g., test command exits with code `0`) that resolves a series of debug edits.
*   A context switch (e.g., the agent finishes editing `auth.ts` and begins reading files in `payment.ts`).
*   A Git commit event (`minddiff sync` hook invocation).

---

## 7. Memory Evolution & Immutability

To guarantee simple state management and data integrity, memory compilation follows a strict append-only paradigm:

1.  **Immutability**: Once written to `memory.json`, a memory block is never modified or updated by the compiler.
2.  **Downstream Corrections**: If a subsequent memory block corrects a previous memory (e.g., discovering that a timezone constraint was false), it is written as a new chronological memory. 
3.  **Relational Evolution**: The Relationship Builder reconciles these differences at the Graph layer (e.g., creating a `supercedes` or `reverts` edge pointing from the new memory back to the historical memory), preserving the complete cognitive trajectory of the developer session.

---

## 8. Taxonomy & Tagging Strategy

MindDiff rejects rigid, hardcoded event categories. Instead, we use an **Evolving Taxonomy** with weighted tag objects:

*   **Fuzzy Classifications**: Memories are annotated with confidence tags (e.g., `planning`, `debugging`, `repository_search`, `code_edit`, `validation`, `error`).
*   **Today's Implementation**: The compiler applies tags using simple structural delimiters (stderr/stdout transitions, prompt redraw patterns, process exits, and Git hook synchronization).
*   **Tomorrow's Scale**: As downstream AI models observe hundreds of developer sessions, common tagging patterns will emerge, allowing the relationship engine to promote recurrent tag clusters into first-class semantic classes (like a `Successful Refactor Loop`).

---

## 9. Forgetting & Compression Roadmap

While forgetting is a core architectural value, compression must be implemented defensively to prevent premature loss of cognitive history.

### Phase 1: Pure Preservation (Current Strategy)
*   **No compression**: Store all data, including redundant loops and repetitive failure iterations. 
*   *Rationale*: Storage is cheap; lost cognition is permanent. In Phase 1, we collect raw and normalized records to establish baseline patterns of how agents and humans interact.

### Phase 2: Structural Compression
*   **Action Merging**: Once patterns are established, the Memory Compiler will merge adjacent redundant cycles.
    *   *Example*: 10 failed runs of `npm run test` with minor syntax edits will be compressed into a single debugging loop block, recording only the initial intent, the number of failures, and the final passing diff.
    *   *Reference Integrity*: The `rawRef` of the compressed block will wrap the entire byte span of the 10 runs in `raw.log`, ensuring the raw evidence is never deleted.
