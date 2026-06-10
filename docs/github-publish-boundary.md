# GitHub Publish Boundary

This document defines what can be published to GitHub and what must stay local before Nodora is made public.

## Publish

The following content is intended for source control:

- `README.md`
- `runbook.md`, after removing local-only setup assumptions if needed
- `templates/`
- `project_template/`
- `app/package.json`
- `app/package-lock.json`
- `app/index.html`
- `app/tsconfig.json`
- `app/vite.config.ts`
- `app/public/`
- `app/scripts/`
- `app/src/`
- `app/src-tauri/Cargo.toml`
- `app/src-tauri/Cargo.lock`
- `app/src-tauri/build.rs`
- `app/src-tauri/src/`
- `app/src-tauri/tauri.conf.json`
- `app/src-tauri/capabilities/`
- `app/src-tauri/icons/`
- `app/src-tauri/gen/schemas/`, unless later regenerated in CI
- `app/.env.example`
- repository governance files such as `.gitignore`, `SECURITY.md`, `.editorconfig`, `.gitattributes`, and `AGENTS.md`

## Do Not Publish

The following content must stay out of GitHub:

- `memory/`
- `sample_project/`
- `app_mvp_spec.md`
- `app_implementation_plan.md`
- `app/node_modules/`
- `app/dist/`
- `app/src-tauri/target/`
- `app/qa-output/`
- `app/.codex-logs/`
- local logs and dev-server output
- `.env`
- `.env.development`
- `.env.production`
- `.env.local`
- `.env.*.local`
- private keys, certificates, cookies, tokens, browser profiles, local databases, and release binaries

`sample_project/` can be replaced later with a sanitized public demo under `examples/`.

## Environment File Rule

Only `app/.env.example` is allowed in Git. Local developers can copy it to `app/.env`:

```powershell
Copy-Item app\.env.example app\.env
```

Do not put API keys, model-provider keys, server credentials, host-specific paths, or production secrets in committed environment files.

## Pre-Publish Checklist

- Run a secret scan before the first public push.
- Confirm ignored files are not staged.
- Review Tauri permissions and CSP.
- Confirm browser QA profiles and local logs are excluded.
- Replace fake test keys with placeholders that do not resemble real provider keys if secret scanners complain.
- Rotate any key that was ever committed, uploaded, logged, or read into an untrusted LLM context.
