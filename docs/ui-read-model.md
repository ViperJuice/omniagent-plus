# UI Read Model

`IF-0-UI-12` freezes the API-ready control/read-model surface that a future
local UI can consume without importing Omnigent transport internals or reading
raw/private inputs.

## Command Surface

```bash
pnpm --filter @omniagent-plus/cli cli -- control snapshot --state-root <path> --json
```

- `control snapshot` returns the `UiControlSnapshot` inside the existing CLI
  envelope.
- Human output is rendered from the same redacted result object as JSON output.
- The command is read-only: it replays durable state and does not append audit
  records, mutate leases, preflight identities, route tasks, or require live
  Omnigent.
- If the selected `state-root` has no ledger yet, the command returns an empty
  snapshot and leaves the missing directory untouched.

## Snapshot Surface

`UiControlSnapshot` exposes:

- `sessions` and `sessionTree`
- `activeTurns`
- `routeDecisions`
- `approvals`
- `cooldowns`
- `worktreeLeases`
- `handoffs`
- `limitClassifications`
- `evidenceRefs`

The surface is intentionally API-ready rather than visual. It gives a future UI
enough metadata to render session trees, approval/cooldown cards, lease status,
and route timelines without exposing raw provider payloads or hidden runtime
internals.

## Redaction Posture

Every UI-facing string/path is validated with the existing redaction helpers:

- `sanitizeMetadataText` for bounded labels, reasons, and summaries
- `sanitizeMetadataPath` for repo-relative evidence paths
- `sanitizeWorkspacePath` for worktree/workspace metadata
- `redactUntrustedText` for bounded evidence excerpts

The projection rejects secret-like values, env dumps, raw provider payloads,
absolute secret-bearing paths, and over-limit evidence excerpts instead of
passing them through the UI surface.

## Non-Goals

- No browser UI shell, SPA, or marketing page
- No account mutation controls
- No raw transcripts or raw provider payload output
- No live Omnigent dependency in default verification
- No release dispatch or commercialization claim

## Spec Closeout

This phase records `spec_delta_closeout.v1` as `no_spec_delta`. The roadmap and
spec authority stay unchanged; this phase only freezes the implementation and
documentation of the API-ready control surface.

## Verification

```bash
pnpm --filter @omniagent-plus/cli cli -- control snapshot --json
pnpm --filter @consiliency/runtime-provider test -- --run packages/core-contracts/src/ui-read-model.test.ts
pnpm --filter @omniagent-plus/state-ledger test -- --run packages/state-ledger/src/replay.test.ts
pnpm --filter @omniagent-plus/cli test -- --run packages/cli/src/control.test.ts packages/cli/src/cli.test.ts packages/cli/src/phase-verification.test.ts
pnpm build
pnpm lint
pnpm typecheck
pnpm test -- --run packages/core-contracts/src packages/state-ledger/src packages/cli/src
find fixtures/ui fixtures/cli/control -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null
git diff --check
phase-loop validate-roadmap specs/phase-plans-v1.md
```
