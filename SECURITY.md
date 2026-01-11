# Security Policy

## Supported Versions

Only the latest `main` branch is supported.

## Reporting a Vulnerability

Please do not open public issues for security reports.

If GitHub Security Advisories are enabled for this repository, use the
"Report a vulnerability" button. If not, open a GitHub Issue requesting
a private channel and avoid sharing sensitive details publicly.

## Secrets Handling

- Never commit `.env`, private keys, or tokens.
- Use Infisical for secrets management in all environments.
- Keep `.env.example` as the only source of example values.
- Store CI secrets in GitHub Secrets (e.g., `INFISICAL_SERVICE_TOKEN`).
- If secrets must be shared, use a secure channel (password manager or
  encrypted transfer) and rotate after exposure.
- `.infisical.json` contains only workspace metadata and is safe to commit.
