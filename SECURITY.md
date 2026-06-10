# Security Policy

## Supported Status

Nodora is currently a local desktop prototype. Security reports and hardening work should focus on local data protection, model-provider credentials, project file boundaries, and Tauri desktop permissions.

## Secret Handling

Do not commit secrets. This includes API keys, model-provider keys, OAuth tokens, cookies, browser profiles, certificates, private keys, local databases, and production configuration.

Committed environment files are limited to examples:

- `app/.env.example`

Example files must contain only non-secret environment selectors or placeholders. Real environment files such as `.env`, `.env.development`, `.env.production`, `.env.local`, and `.env.*.local` must stay local.

Vite client variables are public. Do not store secrets in `VITE_*` variables because they can be bundled into frontend assets.

The Tauri desktop app stores model-provider API keys in the operating system credential store. Browser fallback mode keeps model keys only in session storage and clears legacy local-storage copies.

## Local Data Boundaries

Do not publish:

- `memory/`
- `sample_project/`
- `app_mvp_spec.md`
- `app_implementation_plan.md`
- `app/node_modules/`
- `app/dist/`
- `app/src-tauri/target/`
- `app/qa-output/`
- `app/.codex-logs/`
- `app/.env`
- local logs, browser profiles, release binaries, or generated caches.

## If A Secret Leaks

1. Revoke or rotate the exposed secret immediately.
2. Remove it from the working tree.
3. Purge it from Git history before publishing.
4. Audit provider logs for unauthorized use.
5. Replace affected local configuration with a fresh secret.

If a model-provider key is exposed, assume it is compromised and rotate it. Do not rely on deletion from the repository alone.

## Reporting

For now, report issues privately to the repository owner. Add public issue templates only after the repository is ready for external contributors.
