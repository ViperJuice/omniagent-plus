# Omnigent Upstream Readiness

This document tracks upstream Omnigent movement beyond the frozen release
contract in `docs/omnigent-contract.md`. It is not a replacement for the
`IF-0-CONTRACT-1` freeze.

## Current Decision

- Latest published GitHub release: `v0.3.0`
- Latest published release commit: `4edb4d95b95fd2748f3f119628936d75511918e9`
- Latest release published: `2026-06-27T05:21:16Z`
- Current upstream `main` probe: `3f4d1c8e0b3742579c5c96742086db9e0bd36def`
- Probe time: `2026-07-02T07:15:35Z`
- Pushed pre-release tag: `v0.4.0dev0`
- Pre-release tag commit: `3f4d1c8e0b3742579c5c96742086db9e0bd36def`
- Pre-release GitHub release: none observed
- Pre-release PyPI package: none observed
- Upstream `main` package version: `0.3.0.dev0`

`omniagent-plus` is current with the latest published release. Do not change
runtime behavior to require upstream `main` until Omnigent publishes a new
release or this repo explicitly opts into a main-SHA compatibility lane.

This repo does include additive forward compatibility for the pushed
`v0.4.0dev0` tag where the behavior is optional and does not weaken the
`v0.3.0` freeze:

- `launching` is accepted in raw session-status events and maps to the neutral
  `starting` state.
- `PUT /v1/sessions/{session_id}/read-state` is available on the HTTP client
  and fake server.
- Optional `background_task_count`, `viewer_last_seen`, and `viewer_unread`
  fields are accepted on transport snapshot/event types.
- `OMNIGENT_*` provider credential aliases are treated as secret-shaped in
  redaction and durable-evidence guards.

## Unreleased Main Delta

Contract-relevant deltas observed between `v0.3.0` and upstream `main`:

- OpenAPI adds `PUT /v1/sessions/{session_id}/read-state`.
- `SessionResponse` adds optional `background_task_count`.
- `SessionStatusEvent` adds optional `background_task_count`.
- `SessionListItem` adds `viewer_last_seen` and `viewer_unread`.
- `Usage` adds optional `cost_usd`.
- `CompactionData` adds optional `window_id`.
- `UpdateSessionRequest` adds `silent`.
- OpenAPI now includes `waiting` in session status enums, resolving the
  `v0.3.0` release drift already tolerated by this repo.
- Provider credential resolution adds `OMNIGENT_`-prefixed environment aliases,
  for example `OMNIGENT_ANTHROPIC_API_KEY`.
- `sys_session_send` adds per-subagent `cost_budget` metadata.
- Several native harness, routing, tracing, and web UI changes landed after the
  release, but those should not be treated as stable provider-contract inputs
  until a new release or explicit SHA pin.

Still not upgraded to public transport capability:

- `harness_override` remains internal and allowlist-gated.
- Child-session spawn-under-parent remains internal; public transport can
  observe children and fork sessions but should not claim stable child spawn.

## Bring-Up Plan

Use a detailed-plan lane, not a full new roadmap, when the next Omnigent release
lands. The change is contract-maintenance scoped unless upstream publishes a
breaking transport contract.

1. Refresh upstream release evidence:
   - GitHub release metadata.
   - tag SHA and package version.
   - PyPI package metadata when available.
   - local safe CLI probe (`command -v omnigent`, `command -v omni`).

2. Regenerate contract fixtures:
   - `fixtures/omnigent/discovery/source-metadata.json`
   - `fixtures/omnigent/discovery/http-surface.json`
   - `fixtures/omnigent/discovery/capability-probes.json`
   - fake-server scenarios for any non-additive release changes.

3. Update contract docs:
   - `docs/omnigent-contract.md`
   - `docs/lifecycle-and-events.md`
   - `docs/omnigent-transport.md`
   - `docs/identity-isolation.md`
   - `docs/security-and-secrets.md`

4. Update TypeScript contracts only for public, stable release fields:
   - promote compatible optional fields only when downstream consumers need
     them beyond transport-level acceptance;
   - keep additive upstream fields optional unless acceptance needs them;
   - leave `read-state` optional unless a consumer needs it in the neutral
     provider boundary.

5. Update credential handling:
   - keep prefixed provider variables covered by allowlist and redaction tests;
   - never print the corresponding values in CLI output or live-smoke evidence.

6. Verify:
   - `pnpm build`
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - `find fixtures/omnigent -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null`
   - optional live smoke only when explicitly enabled.

## Non-Goals

- Do not pin this repo to unreleased upstream `main` by default.
- Do not treat upstream web UI-only changes as provider-contract requirements.
- Do not mark `harness_override` or child-session spawn as supported unless the
  public API explicitly exposes and documents them.
- Do not expand environment-variable allowlists by copying the full host env.
