# omniagent-plus

CLI adds `@omniagent-plus/cli` on top of the existing TypeScript workspace so
operators can inspect durable state, classify limits, plan routes, and manage
worktree leases through one local entrypoint:

`pnpm --filter @omniagent-plus/cli cli -- <command>`

This phase targets `IF-0-CLI-11`. Every CLI command supports `--json`, reads
or writes the selected `--state-root`, keeps output `metadata_only`, and maps
nonzero exit code categories for argument errors, missing records, validation
failures, policy blocks, cleanup blocks, route blocks, and unexpected internal
failures.

## Workspace Surface

- `packages/core-contracts` exports the runtime-neutral contracts, schemas,
  redaction helpers, and fake provider used by downstream phases.
- `packages/state-ledger` owns the durable append-only ledger, indexes,
  migrations, retention, replay, cooldown coordination, and worktree lease
  coordination APIs.
- `packages/omnigent-transport` owns the HTTP, CLI, and hybrid Omnigent
  transport boundary without requiring a live Omnigent installation in CI.
- `packages/identity-isolation` and `packages/worktree-leasing` supply the
  metadata-only identity preflight and worktree cleanup primitives consumed by
  the operator CLI.
- `packages/coordinator` owns the route planner, portability scoring, retry
  guardrails, and durable route-decision persistence used by `route-task`.
- `packages/cli` registers `health`, `sessions list`, `sessions show`,
  `route-task`, `classify-limit`, `identities list`,
  `identities preflight`, `worktrees list`, and `worktrees cleanup` under one
  local entrypoint. `classify-limit` and `route-task` default to dry-run and
  only persist metadata-only records when `--record` is passed.
- `fixtures/cli/` carries metadata_only JSON fixtures for the operator CLI
  suites, while `fixtures/identity/`, `fixtures/state-ledger/`, and
  `fixtures/worktree/` remain the committed contract inputs for CLI tests.
- `docs/architecture.md` describes the package boundary, `state-root`
  behavior, `--json` envelope contract, and exit code posture.

## Verification

Run the CLI phase gate from the repo root:

```bash
pnpm install --frozen-lockfile
pnpm --filter @omniagent-plus/cli cli -- health --json
pnpm --filter @omniagent-plus/cli test -- --run packages/cli/src
pnpm build
pnpm lint
pnpm typecheck
find fixtures/cli -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null
phase-loop validate-roadmap specs/phase-plans-v1.md
```

The verification gate also checks that the full workspace still builds and
typechecks, that the CLI command registry exposes the full `IF-0-CLI-11`
surface, and that the docs continue to describe `--json`, `state-root`,
`metadata_only`, and exit code behavior.
