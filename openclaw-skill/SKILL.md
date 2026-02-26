---
name: calcom-cli
description: Unofficial Cal.com CLI operations for personal scheduling workflows. Use when you need to inspect schedules, set or clear date overrides, adjust recurring availability windows, list/share booking links, check slots, and triage/cancel/reschedule bookings via the `calcom` command.
---

# calcom-cli

Use the installed `calcom` binary for fast Cal.com operations.

## Setup

1. Ensure CLI is installed (`calcom --help`).
2. Authenticate once:

```bash
calcom auth set --api-key <CALCOM_API_KEY>
calcom auth status
```

Prefer `CALCOM_API_KEY` env var for ephemeral/runtime auth.

## Safe execution defaults

- Use `--dry-run` before write operations.
- Use `--yes` only when non-interactive confirmation is intentionally skipped.
- Use `--json` when another agent/script will parse output.
- Default timezone is `Europe/Oslo`; override per command with `--timezone`.

## Core commands

### Schedule + availability

```bash
calcom schedule list
calcom schedule show --id <scheduleId>

calcom avail override set --schedule-id <id> --date 2026-03-02 --start 09:00 --end 12:00 --dry-run
calcom avail override clear --schedule-id <id> --date 2026-03-02 --dry-run
calcom avail override list --schedule-id <id> --from 2026-03-01 --to 2026-03-31

calcom avail window set --schedule-id <id> --day mon --start 09:00 --end 17:00 --dry-run
calcom avail window list --schedule-id <id>
```

### Links + slots

```bash
calcom link list
calcom link share --slug <event-type-slug>
calcom slot check --event-type-id <id> --start 2026-03-02T09:00:00+01:00 --end 2026-03-02T17:00:00+01:00
```

### Booking triage

```bash
calcom booking list --today
calcom booking list --upcoming --limit 25
calcom booking cancel --id <bookingUid> --reason "Client requested new time" --dry-run
calcom booking reschedule --id <bookingUid> --start 2026-03-03T10:00:00+01:00 --end 2026-03-03T11:00:00+01:00 --dry-run
```

## OpenClaw install helper

Install this skill into OpenClaw workspace:

```bash
calcom openclaw install-skill --force
```

Default target:
`~/.openclaw/workspace/skills/calcom-cli/SKILL.md`
