# JTBD — Cal.com CLI

This document translates Andreas’s real workflow into product jobs and feature priorities.

## Prioritized jobs

| Priority | Job to be done | Frequency | Why it matters | CLI capability |
|---|---|---:|---|---|
| P0 | Override availability for a specific day | High | Fast control when plans change | `availability override set/clear/list` |
| P1 | Modify regular availability windows | Medium-High | Keep baseline schedule accurate | `availability window set/list` |
| P1 | Share meeting links quickly | High | Frequent outbound scheduling flow | `link list`, `link share` |
| P2 | Inspect schedule state before changing | Medium | Prevent mistakes/overwrites | `schedule show`, `--dry-run` |
| P3 | Create new meeting links (event types) | Low (rare) | Needed occasionally for new offers | `link create` |

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

### Phase 1 (must-have)
1. Auth + config
2. `schedule list/show`
3. `availability override set/clear/list`
4. Validation + dry-run + confirmation

### Phase 2 (high leverage)
1. `link list`
2. `link share --slug`

### Phase 3 (rare flow)
1. `link create`
2. optional `link update`

## Senior-dev implementation notes

- Treat schedule writes as **risky operations**: always fetch current schedule first.
- Avoid destructive updates by preserving non-target fields.
- Add explicit date/time validation and timezone handling.
- Keep output parseable (`--json`) + human mode by default.
- Prefer idempotent behavior where possible.
