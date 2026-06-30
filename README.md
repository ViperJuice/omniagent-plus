# omniagent-plus

TRANSPORT adds `@omniagent-plus/omnigent-transport` on top of the existing
TypeScript workspace, runtime-neutral `@omniagent-plus/core-contracts`, and
durable `@omniagent-plus/state-ledger` packages for
`agent-runtime-provider-omnigent`. This phase targets `IF-0-TRANSPORT-4` by
freezing the real HTTP, CLI, and hybrid transport boundary without requiring a
live Omnigent installation in CI.

## Workspace Surface

- `packages/core-contracts` exports the public contracts, validation schemas,
  lifecycle helpers, and fake provider used by downstream phases.
- `packages/state-ledger` implements the append-only JSONL ledger, migrations,
  retention, audit persistence, redacted evidence storage, replay, and
  cross-process cooldown/worktree coordination APIs.
- `packages/omnigent-transport` implements HTTP, CLI, and hybrid providers,
  fake-server conformance, SSE parsing, process ownership, capability snapshot
  persistence, and failure normalization.
- `fixtures/omnigent/` carries metadata-only Omnigent contract, fake-server,
  event, and error fixtures consumed by the transport suite.
- `docs/omnigent-transport.md` and `docs/architecture.md` explain the HTTP,
  CLI, hybrid, process ownership, capability snapshot, and no live Omnigent CI
  posture.

## Verification

Run the TRANSPORT suite from the repo root:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm typecheck
pnpm test -- --run packages/omnigent-transport/src
phase-loop validate-roadmap specs/phase-plans-v1.md
```

The verification gate also checks that the Omnigent fixtures stay valid, the
full workspace still builds and typechecks, and the transport package exports
HTTP, CLI, hybrid, process ownership, capability snapshot, and no live
Omnigent CI guidance surfaces.
