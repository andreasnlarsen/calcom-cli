# JTBD — Cal.com CLI

This document translates Andreas’s real workflow into product jobs and feature priorities.

## Prioritized jobs (expanded P0 → P3)

| Priority | Job to be done | Frequency | Why it matters | CLI capability |
|---|---|---:|---|---|
| P0 | Override availability for a specific day | High | Fast control when plans change | `avail override set/clear/list` |
| P0 | Share existing booking links fast | High | Keeps outbound scheduling flow fast in chats/DMs | `link list`, `link share` |
| P0 | Quick slot check before sharing | High | Avoids sharing links that won’t convert due to poor availability | `slot check` |
| P1 | Modify recurring weekly availability windows | Medium-High | Keep baseline schedule accurate over time | `avail window set/list` |
| P1 | Booking triage (today/upcoming) | Medium-High | Operational clarity without opening web dashboard | `booking list --today/--upcoming` |
| P1 | Cancel / reschedule bookings from CLI | Medium | Reduce friction when plans shift | `booking cancel`, `booking reschedule` |
| P2 | Create and manage private links | Medium | Controlled sharing for special cases (expiry/usage limits) | `link private create/list/update/delete` |
| P2 | Adjust event-type booking guardrails | Medium | Prevent low-quality bookings and reduce scheduling noise | `link update` (buffers, notice, booking window, limits) |
| P3 | Routing-form slot calculation | Low | Useful for advanced qualification/routing workflows | `routing calc-slots` |
| P3 | Destination calendar switching | Low | Advanced setup and edge-case admin needs | `calendar destination set` |
| P3 | Webhook management | Low | Infra/automation administration | `webhook list/create/update/delete` |

## Job stories

### 1) Date override (primary)
- **When** my day changes unexpectedly,
- **I want** to block or adjust availability for a specific date from CLI,
- **So I can** stay accurate without opening the dashboard.

**Acceptance criteria**
- One command sets an override by date/time.
- One command removes override for a date.
- Command output confirms affected schedule/date/time.
- `--dry-run` shows request payload before writing.

### 2) Share links fast
- **When** I’m messaging a prospect/client,
- **I want** to fetch and share the right booking link in seconds,
- **So I can** keep conversation flow high and reduce friction.

**Acceptance criteria**
- List all event types with title + slug + booking URL.
- Quick share by slug returns copy-ready URL only.

### 3) Modify baseline availability
- **When** my recurring schedule changes,
- **I want** to adjust weekly windows safely,
- **So I can** avoid stale availability causing bad bookings.

**Acceptance criteria**
- Read current schedule first.
- Update only intended fields.
- Clear output diff (before/after summary).

### 4) Create new link (rare flow)
- **When** I launch a new offer,
- **I want** to create a new event type from CLI,
- **So I can** avoid dashboard setup for simple cases.

**Acceptance criteria**
- Minimal required fields only in V1.
- Uses sane defaults.
- Returns booking URL immediately.

## Feature sequencing

### Phase P0 (must-have, first ship)
1. Auth + config
2. `schedule list/show`
3. `avail override set/clear/list`
4. `link list/share`
5. `slot check`
6. Validation + dry-run + confirmation

### Phase P1 (core operator expansion)
1. `avail window set/list`
2. `booking list --today/--upcoming`
3. `booking cancel`
4. `booking reschedule`

### Phase P2 (controlled scale)
1. `link private create/list/update/delete`
2. event-type guardrails via `link update`

### Phase P3 (advanced/admin)
1. `routing calc-slots`
2. `calendar destination set`
3. `webhook list/create/update/delete`

## Senior-dev implementation notes

- Treat schedule writes as **risky operations**: always fetch current schedule first.
- Avoid destructive updates by preserving non-target fields.
- Add explicit date/time validation and timezone handling.
- Keep output parseable (`--json`) + human mode by default.
- Prefer idempotent behavior where possible.
