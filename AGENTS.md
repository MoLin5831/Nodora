# Agent Safety Rules

These rules are advisory guardrails for AI coding assistants working in this repository. They do not replace `.gitignore`, secret scanning, or code review.

## Do Not Read Into LLM Context

Do not open, summarize, embed, or quote files matching:

- `memory/`
- `sample_project/`
- `app/qa-output/`
- `app/.codex-logs/`
- `**/.env`
- `**/.env.development`
- `**/.env.production`
- `**/.env.local`
- `**/.env.*.local`
- `**/env.development`
- `**/env.production`
- `.secrets/`
- `secrets/`
- `private/`
- `credentials/`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`
- `id_rsa*`, `id_ed25519*`
- browser profiles, cookies, tokens, databases, and local cache directories.

Committed `.env.example` files must contain only non-secret environment selectors or placeholders. Real `.env` files stay local.

## Do Not Upload

Never upload local build outputs, dependency folders, browser QA profiles, logs, private planning notes, or credentials. GitHub release binaries should be attached to Releases, not committed to source.

## Leak Response

If a secret is read into context, committed, pushed, or exposed in logs:

1. Tell the user immediately.
2. Ask the user to revoke or rotate the affected key, token, certificate, or password.
3. Remove the secret from the working tree.
4. Purge it from Git history before publishing.
5. Review provider audit logs for unauthorized use.
