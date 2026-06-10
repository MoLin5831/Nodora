# Nodora

Nodora is a desktop planning workflow tool for AI-assisted decision making. It is built around a 14-step planning loop that turns project context, AI questions, user-confirmed decisions, document drafting, review, role translation, and memory updates into one controlled workflow.

Nodora is not a general Markdown editor, a local agent runner, or a collection of unrelated AI tools. AI output is treated as draft material until the user confirms it.

## Core Features

- 14-step planning workflow for structured project documents.
- Project template with context, design decisions, planning documents, review reports, role-specific versions, and workflow state.
- AI conversation with multiple persisted sessions.
- AI-assisted file tasks with read, summarize, write, archive, confirmation, protected-write confirmation, interruption boundaries, and task logs.
- Web research loop with bounded search requests, source metadata, page excerpts, and evidence-backed reports.
- Markdown editing and preview with Mermaid, image placeholder workflow, PDF export, and DOCX export.
- Tauri desktop bridge for selected project folders, local file operations, export support, and model API proxying.

## Security Model

- Nodora only edits project files after user confirmation for protected actions.
- Local file access is scoped to the user-selected project root.
- In the Tauri desktop app, model API keys are stored in the operating system credential store and are not written to project folders. Browser fallback mode keeps keys only for the current session.
- `app/.env` is local-only. Only `app/.env.example` is intended for Git.
- No local Agent mode, Agent CLI, command execution entry point, background agent, multi-agent orchestration, or built-in image generation is included.

See [SECURITY.md](SECURITY.md) and [docs/security-review.md](docs/security-review.md) for more detail.

## Requirements

- Node.js 20 or newer.
- npm 10 or newer.
- Rust toolchain for Tauri desktop development.
- Microsoft Edge or Google Chrome for desktop PDF export.

## Local Setup

```powershell
cd app
npm install
Copy-Item .env.example .env
```

`app/.env.example` currently contains only:

```env
NODORA_CONFIG_ENV=development
```

Do not put API keys, tokens, production secrets, server passwords, or host-specific paths in `.env.example`. Keep real `.env` files local.

## Development

Run the web app:

```powershell
cd app
npm run dev
```

Run the Tauri desktop app:

```powershell
cd app
npm run tauri:dev
```

Run tests and build:

```powershell
cd app
npm test
npm run build
```

If Rust backend code changes, run:

```powershell
cd app\src-tauri
cargo test
```

## Project Structure

```text
workflow_prototype/
  app/                 Tauri + React application
  project_template/    Default Nodora project structure
  templates/           Workflow prompt and document templates
  docs/                Public architecture, roadmap, and security notes
```

The following local development files are intentionally not published:

- `memory/`
- `sample_project/`
- `app_mvp_spec.md`
- `app_implementation_plan.md`
- build outputs, browser QA profiles, local logs, and real environment files

## Documentation

- [Architecture](docs/architecture.md)
- [Roadmap](docs/roadmap.md)
- [Security Review](docs/security-review.md)
- [GitHub Publish Boundary](docs/github-publish-boundary.md)
- [Contributing](CONTRIBUTING.md)

## License

MIT. See [LICENSE](LICENSE).
