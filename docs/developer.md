# MindDiff Contributor & Maintainer Handbook

Welcome to the MindDiff contributor handbook. This guide covers how to set up, run, test, validate, pack, and publish MindDiff.

---

## 1. Repository Setup & Bootstrapping

### Step 1: Clone and Install Dependencies
Clone the repository and install the development dependencies:
```bash
npm install
```

### Step 2: macOS ARM64 `node-pty` Permissions Fix
If you are developing on macOS (especially Apple Silicon/arm64) and encounter a `posix_spawnp failed` crash when spawning processes, the `node-pty` spawn-helper binary lacks execution permissions.

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
- Verify that a `.minddiff/` directory has been created in your workspace.
- Verify that `.git/hooks/post-commit` contains the `minddiff sync` command.

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

# Wrap any arbitrary command or other agent (e.g. node)
npm run dev -- run node --version
```

### Watching Live Logs
To watch the active log stream from the latest session in real-time, open a new terminal window and run:
```bash
npm run dev -- watch
```

---

## 3. Build & Test Process

### Building the Project
To compile the TypeScript source files (`src/`) into JavaScript executable files (`dist/`):
```bash
npm run build
```
Once built, you can run the compiled binary directly:
```bash
node dist/cli.js <command>
```

### Running the Test Suite
MindDiff contains a test suite verifying terminal log reconstruction, segmentation, cognitive inference, and handoff compiler stages. Run tests using:
```bash
npm test
```

---

## 4. Local CLI Binary Link / Unlink

To test command behaviors globally under development without affecting your main production installations, use the built-in development linking scripts.

### Link `minddiff-dev`
Generate a global symlink named `minddiff-dev` pointing to your current local repository's `dist/cli.js`:
```bash
npm run link-dev
```
Now, you can run `minddiff-dev` from any folder on your machine. This executes your latest local compiled build.

### Unlink `minddiff-dev`
Remove the development command symlink:
```bash
npm run unlink-dev
```

*Note: Your production-installed version of `minddiff` remains unaffected and fully independent while using `minddiff-dev`.*

---

## 5. Release Candidate Validation & Packaging

Before preparing a new release, you must package and validate release candidates.

### Step 1: Create a Tarball package
To test the packaging process and verify what files will be included in the npm package:
```bash
npm pack
```
This generates a `minddiff-1.1.0.tgz` file in the repository root.

### Step 2: Validate the Tarball
Create a clean directory outside the repository, install the tarball, and run verification:
```bash
mkdir -p /tmp/minddiff-test
cd /tmp/minddiff-test
npm init -y
npm install /path/to/minddiff-1.1.0.tgz
npx minddiff --version
```

---

## 6. Playground Workflow (UX Verification Strategy)

To ensure the first-run experience, onboarding, and interactive command behaviors remain flawless and do not regress, maintainers should test against a dedicated playground setup.

Set up a `playgrounds/` folder outside the repository or as Git-ignored subdirectories:

```
playgrounds/
├── no-git/              # Clean folder with NO git repository
├── git-only/            # Git repository initialized, but MindDiff NEVER initialized
├── initialized/         # Fully initialized Git repo & MindDiff (.minddiff exists)
└── existing-project/    # Pre-existing project with history, multiple commits, and sessions
```

### Verification Scenarios to Run Before Every Release:

1. **Clean Run (`no-git`):**
   - Navigate to `playgrounds/no-git/`
   - Run `minddiff-dev run`
   - Verify the CLI explains why Git is recommended and offers to initialize it.
   - Select `Initialize Git`. Verify Git initializes successfully and the flow moves directly to the MindDiff initialization offer.
   - Accept MindDiff initialization. Verify `.minddiff/` is created and the agent picker launches.

2. **Git Only Run (`git-only`):**
   - Navigate to `playgrounds/git-only/`
   - Run `minddiff-dev run`
   - Verify the CLI detects Git and skips the Git prompt.
   - Verify the CLI offers to initialize MindDiff automatically. Select `Initialize`.
   - Verify hooks are installed in `.git/hooks/` and the agent picker launches.

3. **No Arguments Fallbacks:**
   - In a non-interactive shell (e.g., piped to cat or run in a script):
     - Run `minddiff-dev view`
     - Run `minddiff-dev log`
     - Run `minddiff-dev commit`
   - Verify they do not crash or show simple usage lines, but print rich command manuals, usage examples, and lists of recent session/commit resources on disk.

---

## 7. Publishing Workflow

Once validation passes:

1. **Bump Version:** Update version in `package.json` and update `CHANGELOG.md`.
2. **Build and Pack:** Run `npm run build` to compile the final distribution.
3. **Publish:** Run `npm publish` (add `--tag next` for release candidates).
