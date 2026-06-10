# Contributing

Nodora is currently an early desktop workflow project. Contributions should preserve its product boundary: AI decision workflow first, not a generic editor or local agent platform.

## Development Workflow

1. Create changes in a focused branch.
2. Keep local-only files out of Git.
3. Run the required checks before opening a pull request:

```powershell
cd app
npm test
npm run build
```

If Rust backend code changes, also run:

```powershell
cd app\src-tauri
cargo test
```

## Product Boundaries

Do not add or restore:

- local Agent mode
- Agent CLI
- local command execution entry points
- background agents
- multi-agent orchestration
- built-in image generation

Visual asset support should remain a document workflow for describing needed images, not an embedded image generation feature.

## Security Expectations

- Do not commit secrets or real `.env` files.
- Do not commit build output, browser profiles, logs, or local databases.
- Keep model keys out of project folders.
- Keep local file operations scoped to the selected project root.
- Preserve user confirmation before protected document writes, archive writes, deletes, moves, or memory updates.
