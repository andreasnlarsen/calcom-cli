# @andreasnlarsen/calcom-cli

A production-ready Node.js TypeScript CLI for Cal.com personal-account workflows.

## Important legal / brand notice

- This project is **unofficial** and is **not affiliated with, endorsed by, or sponsored by Cal.com**.
- Cal.com name is used for API compatibility/reference.
- Never commit or share API keys/tokens in source code or logs.

## Install

```bash
npm install -g @andreasnlarsen/calcom-cli
```

Run with:

```bash
calcom --help
```

## OpenClaw skill (bundled)

The npm package includes a bundled OpenClaw skill at `openclaw-skill/SKILL.md`.

Install it into your OpenClaw workspace:

```bash
calcom openclaw install-skill --force
```

Default target:
`~/.openclaw/workspace/skills/calcom-cli/SKILL.md`

## Authentication and safety model

`calcom` supports two auth sources:

1. `CALCOM_API_KEY` environment variable (highest priority)
2. Local XDG config file (`$XDG_CONFIG_HOME/calcom-cli/config.json` or `~/.config/calcom-cli/config.json`)

The config file is always written with `0600` permissions.

Secrets are never printed in normal output. `auth status` shows only a masked preview.

Set auth:

```bash
calcom auth set --api-key <your-key>
calcom auth status
```

If missing auth, commands return an actionable message.

## Defaults

- Base URL: `https://api.cal.com`
- Default timezone: `Europe/Oslo` (override with `--timezone` or persist via `auth set --timezone`)
- Endpoint-specific API versions:
  - schedules: `2024-06-11`
  - event-types: `2024-06-14`
  - slots: `2024-09-04`
  - bookings: `2024-08-13`

## Output modes

- Human-readable output by default
- `--json` for machine-safe output on all commands

## Commands

### P0

```bash
# Auth
calcom auth set --api-key <key>
calcom auth status

# Schedules
calcom schedule list
calcom schedule show --id 123

# Date overrides
calcom avail override set --schedule-id 123 --date 2026-03-02 --start 09:00 --end 12:00 --dry-run
calcom avail override clear --schedule-id 123 --date 2026-03-02 --yes
calcom avail override list --schedule-id 123 --from 2026-03-01 --to 2026-03-31

# Link workflows
calcom link list
calcom link share --slug growth-audit

# Slot check
calcom slot check --event-type-id 456 --start 2026-03-02T09:00:00+01:00 --end 2026-03-02T17:00:00+01:00
```

### P1

```bash
# Recurring windows
calcom avail window set --schedule-id 123 --day mon --start 09:00 --end 17:00 --yes
calcom avail window list --schedule-id 123

# Booking triage
calcom booking list --today
calcom booking list --upcoming --limit 25

# Booking writes
calcom booking cancel --id 789 --reason "Client requested new time" --yes
calcom booking reschedule --id 789 --start 2026-03-03T10:00:00+01:00 --end 2026-03-03T11:00:00+01:00 --dry-run
```

Write commands support:

- `--dry-run` to inspect payload before writing
- `--yes` to bypass confirmation prompts

OpenClaw helper command:

```bash
calcom openclaw install-skill --force
```

## Development

```bash
npm install
npm test
npm run build
```

## Publishing (same model as whoop-cli)

### Trusted publishing (recommended)

This repo includes `.github/workflows/npm-publish.yml` for npm OIDC trusted publishing with provenance.

Release flow:

1. Bump `package.json` version.
2. Commit + push.
3. Create and push a matching tag: `v<version>`.
4. GitHub Action publishes to npm.

```bash
git tag v0.1.0
git push origin v0.1.0
```

### Manual fallback publish

```bash
npm run publish:manual
```

This runs typecheck/tests/build, verifies npm auth, ensures version is not already published, then publishes.

Note: local/manual publish does **not** include `--provenance` (npm requires a supported CI provider for automatic provenance). Provenance is handled by the GitHub Actions trusted-publisher workflow.

## Architecture notes

- `src/cli.ts`: command tree and handlers
- `src/api/client.ts`: HTTP client + auth + version headers + error normalization
- `src/api/calcom.ts`: endpoint wrappers
- `src/config.ts` / `src/auth.ts`: local config and auth resolution
- `src/payloads.ts`: isolated write payload builders (unit-tested)
- `src/validators.ts`: shared zod validation
- `openclaw-skill/SKILL.md`: bundled skill for OpenClaw usage

## Roadmap (out of scope for this release)

- P2: private link CRUD, event-type guardrails
- P3: routing slot calculations, destination calendar switching, webhook management

## License

MIT
