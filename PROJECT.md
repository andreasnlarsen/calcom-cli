---
project: calcom-cli
status: active
owner: andreas
tags: [cli, scheduling, cal.com, api]
updated: 2026-02-26
---

# Cal.com CLI

> **Result:** A practical CLI for Andreas’s real scheduling workflow, starting with fast date-override availability edits.
> **Purpose:** Reduce friction in day-to-day calendar operations (availability + link sharing) without opening the web UI.

## Context

This project is a new CLI-first integration for Cal.com APIs.

Working name: **`calcom-cli`** (clearer than `cal-cli`; we can rename later if needed).

The first high-value action is explicit:
- **Override availability for a certain day** (fast, reliable, scriptable).

## Research snapshot (senior-dev view)

### Official source of truth
- API docs: https://cal.com/docs/api-reference/v2/introduction
- Schedules endpoints:
  - GET `/v2/schedules`
  - PATCH `/v2/schedules/{scheduleId}`
- Event types endpoints:
  - GET `/v2/event-types`
  - POST `/v2/event-types`
  - PATCH `/v2/event-types/{eventTypeId}`

### Key implementation facts
- Auth is Bearer (`Authorization: Bearer <token>`), API key or OAuth token.
- `cal-api-version` header is required and endpoint-specific (e.g. schedules `2024-06-11`, event types `2024-06-14`).
- Schedule payloads include `availability` + `overrides`.
- Event type payloads include `bookingUrl` (useful for quick link sharing).

### Ecosystem scan (GitHub, high-star bias)
- No clear, high-star, Cal.com-specific CLI found to adopt/fork directly.
- Best path is likely **build focused internal CLI** tailored to Andreas workflow.

## Product direction

### Prioritized user outcomes
1. **Set date override quickly** (primary, first shipped feature).
2. **Modify availability windows** (common).
3. **Share existing meeting links fast** (common).
4. **Create new booking links** (rare, but needed).

## MVP scope (Phase 1)

### Ship first
- `availability override set` (date + start/end + schedule)
- `availability override clear` (date + schedule)
- `availability override list` (range + schedule)

### Safety behavior
- Fetch schedule first before patching.
- Preserve existing weekly availability; update only intended override(s).
- Dry-run mode prints exact PATCH payload before execution.
- Human-readable confirmation after write.

## Proposed command surface (draft)

```bash
# inspect
calcom schedule list
calcom schedule show --schedule default

# date overrides (MVP)
calcom availability override set --date 2026-03-02 --start 09:00 --end 12:00 --schedule default
calcom availability override clear --date 2026-03-02 --schedule default
calcom availability override list --from 2026-03-01 --to 2026-03-31 --schedule default

# links
calcom link list
calcom link share --slug growth-audit

# rare flow
calcom link create --title "Growth Audit" --slug growth-audit --duration 60
```

> Note: command names are placeholders; final CLI naming will be normalized in implementation.

## Non-goals (for now)
- Full parity with all Cal.com API endpoints.
- Complex org/platform admin flows.
- UI/dashboard replacement.

## Milestones

### M0 — Discovery + specs (now)
- [x] Define project intent
- [x] Capture JTBD + priorities
- [x] Confirm first feature = date override

### M1 — Core availability override
- [ ] Auth + config bootstrap
- [ ] schedule list/show
- [ ] override set/clear/list
- [ ] dry-run + robust validation

### M2 — Link workflow
- [ ] list existing links (event types)
- [ ] share link command output optimized for copy/paste

### M3 — Rare create flow
- [ ] create new link/event type command
- [ ] sensible defaults for Andreas’s workflow

## Open questions
- Preferred package/repo name: `calcom-cli` vs `cal-cli`.
- Preferred auth mode for V1: API key only first, then OAuth?
- Should command aliases be short (`calc`) or explicit (`calcom`)?
