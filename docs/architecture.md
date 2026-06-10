# Architecture

Nodora has three main layers:

1. React frontend for workflow UI, Markdown editing, AI conversation, project file tasks, export controls, and settings.
2. Tauri backend for desktop-only capabilities such as selected-root file access, model API proxying, web search, PDF export, and DOCX export.
3. Markdown project structure that stores context, decisions, planning documents, role translations, review reports, and workflow state.

## Workflow Model

The product is organized around a 14-step planning loop:

1. Project context setup.
2. AI clarification questions.
3. User decision confirmation.
4. Framework and outline generation.
5. Style and granularity alignment.
6. Main planning document drafting.
7. Section-level review.
8. Consistency review.
9. Visual asset placeholder planning.
10. Role translation.
11. Task version generation.
12. Version consistency check.
13. Archive and memory update.
14. Workflow retrospective.

The workflow treats AI output as draft material. Protected writes require user confirmation.

## Frontend

The frontend lives in `app/src/`.

- `App.tsx` coordinates the current application shell and workflow state.
- `lib/projectFileAgent.ts` parses and executes AI file task plans with confirmation boundaries.
- `lib/aiProviders.ts` sends OpenAI-compatible requests.
- `lib/modelConfig.ts` stores model provider configuration and session-only browser API key fallback state.
- `components/MarkdownPreview.tsx` renders Markdown, Mermaid, and project image references.

## Desktop Backend

The backend lives in `app/src-tauri/src/`.

- `lib.rs` exposes Tauri commands for model proxying, web search, local file bridge, export, and project validation.
- `docx_export.rs` converts export HTML into DOCX.

Local file commands canonicalize the selected project root and reject relative paths that escape that root.

## Security Boundaries

- The model proxy only supports controlled GET/POST requests to OpenAI-compatible paths.
- Desktop model API keys are stored through the operating system credential store and read by the backend proxy.
- Web search limits query length, result count, fetched pages, timeouts, and evidence size.
- PDF export uses a temporary workspace under the selected project root and removes it after rendering.
- Development diagnostics are hidden in production builds.
