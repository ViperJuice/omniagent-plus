# omniagent-plus

The current local surface combines the operator CLI with the frozen
`IF-0-UI-12` read-model layer so operators can inspect durable state, project
an API-ready control snapshot, classify limits, plan routes, and manage
worktree leases through one local entrypoint:

`pnpm --filter @omniagent-plus/cli cli -- <command>`

`control snapshot` is read-only, replays the durable ledger without requiring
live Omnigent, and returns the same redacted `UiControlSnapshot` in both JSON
and deterministic human output. The existing CLI commands still support
`--json`, read or write the selected `--state-root`, keep output
`metadata_only`, and map nonzero exit code categories for argument errors,
missing records, validation failures, policy blocks, cleanup blocks, route
blocks, and unexpected internal failures.

## Workspace Surface

- `packages/core-contracts` exports the runtime-neutral contracts, schemas,
  redaction helpers, fake provider, and the schema-backed UI read-model types
  used by downstream phases.
- `packages/state-ledger` owns the durable append-only ledger, indexes,
  migrations, retention, replay, cooldown coordination, worktree lease
  coordination APIs, and the read-only control snapshot projection.
- `packages/omnigent-transport` owns the HTTP, CLI, and hybrid Omnigent
  transport boundary without requiring a live Omnigent installation in CI.
- `packages/identity-isolation` and `packages/worktree-leasing` supply the
  metadata-only identity preflight and worktree cleanup primitives consumed by
  the operator CLI.
- `packages/coordinator` owns the route planner, portability scoring, retry
  guardrails, and durable route-decision persistence used by `route-task`.
- `packages/cli` registers `health`, `sessions list`, `sessions show`,
  `control snapshot`, `route-task`, `classify-limit`, `identities list`,
  `identities preflight`, `worktrees list`, and `worktrees cleanup` under one
  local entrypoint. `control snapshot` replays durable state without writing
  records, while `classify-limit` and `route-task` default to dry-run and only
  persist metadata-only records when `--record` is passed.
- `fixtures/cli/` carries metadata_only JSON fixtures for the operator CLI
  suites, `fixtures/ui/` carries the frozen read-model fixtures, and
  `fixtures/identity/`, `fixtures/state-ledger/`, and `fixtures/worktree/`
  remain the committed contract inputs for downstream tests.
- `docs/architecture.md` and `docs/ui-read-model.md` describe the package
  boundary, `state-root` behavior, `--json` envelope contract, redaction
  posture, read-only control snapshot surface, non-goals, and the
  `no_spec_delta` closeout decision for this phase.

## Verification

Run the UI phase gate from the repo root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @omniagent-plus/cli cli -- control snapshot --json
pnpm --filter @omniagent-plus/core-contracts test -- --run packages/core-contracts/src/ui-read-model.test.ts
pnpm --filter @omniagent-plus/state-ledger test -- --run packages/state-ledger/src/replay.test.ts
pnpm --filter @omniagent-plus/cli test -- --run packages/cli/src/control.test.ts packages/cli/src/cli.test.ts packages/cli/src/phase-verification.test.ts
pnpm build
pnpm lint
pnpm typecheck
find fixtures/ui fixtures/cli/control -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null
phase-loop validate-roadmap specs/phase-plans-v1.md
```

The verification gate also checks that the full workspace still builds and
typechecks, that the CLI command registry exposes the `control snapshot`
surface, that the read-model contracts reject unsafe metadata/evidence, and
that the docs continue to describe `--json`, `state-root`, `metadata_only`,
read-only replay behavior, and the non-dispatch `no_spec_delta` posture.
