# Architecture

TRANSPORT extends the repository with the first real Omnigent transport layer:

```text
consumer repos
  -> @omniagent-plus/core-contracts
  -> @omniagent-plus/state-ledger
  -> @omniagent-plus/omnigent-transport
  -> Omnigent runtime boundary
```

## Package Boundary

`@omniagent-plus/core-contracts` still owns the runtime-neutral public contract:

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

`@omniagent-plus/omnigent-transport` now owns the real transport boundary for
`IF-0-TRANSPORT-4`:

- HTTP session creation, history reads, event posts, stream parsing, reconnect
  snapshot dedupe, and duplicate terminal normalization
- CLI fallback around documented `run`, `resume`, `attach`, and
  `server start/status/stop` commands
- hybrid local-server process ownership, heartbeat probes, parent-death cleanup,
  and timeout cleanup
- failure normalization into `RuntimeFailure` plus bounded limit-classification
  candidates
- capability snapshot generation and persistence through the durable ledger

## Explicit Non-Goals

- No live Omnigent requirement in CI.
- No governed-pipeline or agent-harness adapter code yet.
- No secret-bearing raw Omnigent payload exports from the public package.

TRANSPORT freezes HTTP, CLI, hybrid, process ownership, and capability snapshot
behavior without pretending downstream routing, identity isolation, adapters,
CLI UX, or release-dispatch surfaces are already complete.
