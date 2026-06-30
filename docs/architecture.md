# Architecture

BOOTCORE keeps the repository intentionally small:

```text
consumer repos
  -> @omniagent-plus/core-contracts
  -> later durable state / transport / adapter packages
  -> Omnigent runtime boundary
```

## Package Boundary

`@omniagent-plus/core-contracts` owns the public TypeScript-first contract that
later phases build on:

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

The package also owns the lifecycle reducers and the fake provider used to
prove idempotency, one-active-turn policy, replay cursors, sequence gaps,
heartbeats, cancellation, and exactly-one terminal event normalization.

## Explicit Non-Goals

- No real Omnigent HTTP, CLI, or subprocess transport code.
- No durable ledger, migrations, cooldown policy, or worktree lock cleanup.
- No governed-pipeline or agent-harness adapter code.

Those surfaces stay blocked until later interface-freeze gates. BOOTCORE only
needs enough structure to make `IF-0-BOOTCORE-2` stable and test-covered while
preserving the no-real-Omnigent dependency rule.
