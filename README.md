# @andreasnlarsen/calcom-cli

A production-ready Node.js TypeScript CLI for Cal.com personal-account workflows.

## Install

```bash
npm install -g @andreasnlarsen/calcom-cli
```

Run with:

```bash
calcom --help
```

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

## Development

```bash
npm install
npm test
npm run build
```

## Architecture notes

- `src/cli.ts`: command tree and handlers
- `src/api/client.ts`: HTTP client + auth + version headers + error normalization
- `src/api/calcom.ts`: endpoint wrappers
- `src/config.ts` / `src/auth.ts`: local config and auth resolution
- `src/payloads.ts`: isolated write payload builders (unit-tested)
- `src/validators.ts`: shared zod validation

## Roadmap (out of scope for this release)

- P2: private link CRUD, event-type guardrails
- P3: routing slot calculations, destination calendar switching, webhook management

## License

MIT
