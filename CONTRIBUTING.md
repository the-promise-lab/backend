# Contributing

Thanks for contributing! This repository follows a simple flow for
consistency and reproducibility.

## Setup

- Use Node.js v22 (`.nvmrc`).
- Install dependencies: `npm install`
- Create a local env file: `cp .env.example .env`

## Development

- Start dev server: `npm run start:dev`
- Lint: `npm run lint`
- Format: `npm run format`
- Test: `npm run test`

## Branches

- `feature/*` for new features
- `fix/*` for bug fixes
- `refactor/*` for refactors
- `chore/*` for maintenance

## Commit Messages

Use prefixes:
`feat`, `fix`, `refactor`, `chore`, `docs`, `test`

Examples:

- `feat: add session summary endpoint`
- `fix: handle null user profile`

## Pull Requests

- Target branch: `main`
- Ensure CI passes
- Update docs when behavior changes
