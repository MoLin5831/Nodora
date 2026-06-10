# Security Review

Review date: 2026-06-10

## Scope

This review covers the source files intended for GitHub publication:

- React frontend under `app/src/`
- Tauri backend under `app/src-tauri/src/`
- scripts under `app/scripts/`
- public project templates under `project_template/` and `templates/`
- repository governance files and public docs

The following local files are intentionally excluded from publication:

- `memory/`
- `sample_project/`
- `app_mvp_spec.md`
- `app_implementation_plan.md`
- dependency folders, build output, browser profiles, logs, real environment files, and release binaries

## Completed Hardening

- `.gitignore` now keeps real `.env` files local and allows only `.env.example`.
- `app/.env` is ignored; `app/.env.example` is safe to commit.
- Test fake keys no longer use real-provider-looking `sk-` prefixes.
- Test output no longer uses the Node console logging API.
- Tauri CLI wrapper no longer hardcodes a local cache path in its error message.
- Tauri app config now has a CSP instead of `csp: null`.
- PDF export cleanup no longer prints local temporary paths to stderr.
- Local file bridge diagnostics are hidden in production builds.
- Public docs now describe security boundaries, non-goals, and leak response.

## Current Residual Risks

- Model API keys are stored in the operating system credential store in the Tauri desktop app. Browser fallback mode keeps keys only in session storage and clears legacy local-storage copies during migration.
- The model API proxy accepts user-configured HTTP/HTTPS API bases. This supports OpenAI-compatible providers but should continue to be treated as a user-controlled desktop capability, not a hosted service proxy.
- `App.tsx` remains large and should be split for maintainability.
- GitHub Actions are not added yet; when added, actions should be pinned and workflow permissions should be minimized.

## Verification Checklist

- Run secret scanning before first push.
- Run `npm test`.
- Run `npm run build`.
- Run `cargo test` after Rust backend changes.
- Review staged files before commit with `git diff --cached --name-only`.
