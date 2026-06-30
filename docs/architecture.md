# Architecture

CLI extends the repository with the first operator-facing package that reads
and writes the durable ledger, identity preflight state, worktree lease state,
limit classifications, and route decisions through one local entrypoint:

```text
consumer repos
  -> @omniagent-plus/core-contracts
  -> @omniagent-plus/state-ledger
  -> @omniagent-plus/identity-isolation
  -> @omniagent-plus/worktree-leasing
  -> @omniagent-plus/omnigent-transport
  -> @omniagent-plus/coordinator
  -> @omniagent-plus/cli
  -> Omnigent runtime boundary
```

## Package Boundary

`@omniagent-plus/core-contracts` still owns the runtime-neutral public
contract:

- `AgentRuntimeProvider`
- `AgentSession`
- `TurnHandle`
- `RuntimeEventEnvelope`
- `HandoffPacket`
- `LimitClassification`
- `RouteDecision`
- `RuntimeFailure`
- `IdentityProfile`
- `WorktreeLease`

`@omniagent-plus/state-ledger` still owns the durable local backend slice:

- append-only JSONL ledger plus sidecar indexes
- schema-versioned migrations and retention compaction
- audit persistence for sessions, turns, events, routes, approvals, cooldowns,
  leases, capability snapshot records, and evidence refs
- replay APIs that do not require live Omnigent
- shared cooldown and worktree lease coordination across Node processes

`@omniagent-plus/identity-isolation` and `@omniagent-plus/worktree-leasing`
still own the reusable metadata-only operator primitives:

- committed identity profile loading and `identities preflight` status
  generation without hidden credential lookup
- worktree lease registry state, active-process checks, dirty-state checks, and
  cleanup blocking reasons

`@omniagent-plus/omnigent-transport` still owns the real transport boundary for
`IF-0-TRANSPORT-4`:

- HTTP session creation, history reads, event posts, stream parsing, reconnect
  snapshot dedupe, and duplicate terminal normalization
- CLI fallback around documented `run`, `resume`, `attach`, and
  `server start/status/stop` commands
- hybrid local-server process ownership, heartbeat probes, parent-death
  cleanup, and timeout cleanup
- failure normalization into `RuntimeFailure` plus bounded limit-classification
  candidates
- capability snapshot generation and persistence through the durable ledger

`@omniagent-plus/coordinator` still owns `IF-0-COORDINATOR-9`:

- identity-pool inventory with cooldown, capability-fit, and active-turn
  accounting
- adaptive concurrency that reduces active-turn targets under burst,
  concurrency, health, and hard-cap pressure
- portability scoring and route planning across provider families when policy
  allows it
- durable route persistence that is persisted before launch and fails closed if
  append-before-launch cannot complete
- retry storm guardrails, failure policy, and replay-safe route explanations
  that stay `metadata_only`

`@omniagent-plus/cli` now owns `IF-0-CLI-11`:

- one local entrypoint,
  `pnpm --filter @omniagent-plus/cli cli -- <command>`,
  for `health`, `sessions list`, `sessions show`, `route-task`,
  `classify-limit`, `identities list`, `identities preflight`,
  `worktrees list`, and `worktrees cleanup`
- a schema-backed `--json` envelope with `schema`, `ok`, `command`,
  `stateRoot`, and typed `result` or `error` payloads
- human-readable output derived from the same redacted `metadata_only` command
  result used for JSON output
- explicit `state-root` selection so repeated invocations share the same
  durable backend
- typed exit code categories for argument errors, missing records, validation
  failures, policy blocks, cleanup blocks, route blocks, and unexpected
  internal failures
- dry-run-by-default `classify-limit` and `route-task` behavior that records
  durable metadata only when `--record` is passed

## Explicit Non-Goals

- No live Omnigent requirement in CI.
- No global install or release packaging for the CLI package in this phase.
- No hidden credential lookup, bearer token output, raw provider payload
  output, or unbounded transcript output from CLI commands.
- No provider launch side effects from `route-task` or `classify-limit`.
- No same-provider quota bypass through account hopping during provider-family
  cooldowns.
- No UI read model or release-dispatch surface in this phase.

CLI freezes the operator-facing `state-root`, `--json`, `metadata_only`, and
exit code behavior without pretending downstream UI or hardening surfaces are
already complete.
