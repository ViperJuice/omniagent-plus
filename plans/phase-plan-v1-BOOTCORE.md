---
phase_loop_plan_version: 1
phase: BOOTCORE
roadmap: specs/phase-plans-v1.md
roadmap_sha256: cd559015ff6624aeb1ccbb8a708835c06a747d77d3c62c6a1894af1d8e21bb90
---

# BOOTCORE: Bootstrap And Core Contracts

## Context

`BOOTCORE` is Phase 2 from `specs/phase-plans-v1.md`. The canonical `.phase-loop/` state marks `CONTRACT` complete at commit `42a6741fc957de7ed951c5c467af0a161a6d7278`, leaves `BOOTCORE` unplanned, and records a clean worktree before this plan run. This plan consumes `IF-0-CONTRACT-1` from `docs/omnigent-contract.md` and the metadata-only fixtures under `fixtures/omnigent/`.

The phase creates the TypeScript monorepo skeleton and the runtime-neutral `core-contracts` package. It must keep the core package independent from real Omnigent transport, durable state, scheduler/router behavior, downstream adapters, and UI surfaces. The implementation must model typed capability degradation from the frozen contract, including emulated logical close, blocked child-session creation, blocked public harness override, duplicate upstream terminal markers, and the documented `waiting` session-status drift.

## Interface Freeze Gates

- [ ] IF-0-BOOTCORE-2 - Repository bootstrap, package boundaries, core runtime schemas, session and turn state-machine tables, fake provider, and fake event stream are stable and test-covered.
  - Required workspace surface: root `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, strict TypeScript config, ESLint config, Vitest config, root README, architecture docs, and `packages/core-contracts` package metadata.
  - Required public contracts: `AgentRuntimeProvider`, `AgentSession`, `TurnHandle`, `RuntimeEventEnvelope`, `HandoffPacket`, `LimitClassification`, `RouteDecision`, `RuntimeFailure`, `IdentityProfile`, and `WorktreeLease` are exported with validation schemas.
  - Required lifecycle proof: documented and tested session/turn transition tables enforce idempotent session/turn creation, one-active-turn policy, cancellation, event replay, sequence-gap failure, heartbeats, and exactly-one normalized terminal turn event.
  - Required dependency boundary: `packages/core-contracts` has no real Omnigent dependency and consumes only frozen `IF-0-CONTRACT-1` fixture semantics for fake-provider behavior.

## Spec Closeout Plan

- schema: `spec_delta_closeout.v1`
- decision: `no_spec_delta`
- target surfaces: `packages/core-contracts/`, `fixtures/core/`, `docs/lifecycle-and-events.md`, `README.md`, `docs/architecture.md`
- evidence paths: `packages/core-contracts/src/**/*.test.ts`, `fixtures/core/`, `.phase-loop/runs/<run>/verification.json`
- redaction posture: `metadata_only`
- downstream handling: none; downstream phases may consume `IF-0-BOOTCORE-2` only after the closeout records the produced gate and the automation suite passes.

## Lane Index & Dependencies

SL-0 — Workspace and package bootstrap
  Depends on: (none)
  Blocks: SL-1, SL-2, SL-3, SL-4, SL-5
  Parallel-safe: no

SL-1 — Core schema contracts and public exports
  Depends on: SL-0
  Blocks: SL-2, SL-3, SL-4, SL-5
  Parallel-safe: yes

SL-2 — Lifecycle state machines and event fixtures
  Depends on: SL-1
  Blocks: SL-3, SL-4, SL-5
  Parallel-safe: yes

SL-3 — Fake provider and fake event stream
  Depends on: SL-1, SL-2
  Blocks: SL-4, SL-5
  Parallel-safe: yes

SL-4 — Pre-closeout verification reducer
  Depends on: SL-0, SL-1, SL-2, SL-3
  Blocks: SL-5
  Parallel-safe: no

SL-5 — Documentation and phase verification reducer
  Depends on: SL-0, SL-1, SL-2, SL-3, SL-4
  Blocks: (none)
  Parallel-safe: no

## Execution Policy

- work-unit defaults: work-unit=`lane_execute`, effort=`high`, unsupported=`inherit_default`, inherit-default=`true`
- SL-4: executor=`codex`, model=`gpt-5.5`, effort=`medium`, work-unit=`phase_verify`, reason=`pre-closeout verification`
- SL-5: executor=`codex`, model=`gpt-5.5`, effort=`medium`, work-unit=`phase_reducer`, reason=`documentation and phase closeout reducer`

## Lanes

### SL-0 - Workspace and package bootstrap

- **Scope**: Create the root pnpm workspace, strict TypeScript/Vitest/ESLint tooling, and `core-contracts` package boundary without adding production transport code.
- **Owned files**: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `packages/core-contracts/package.json`, `packages/core-contracts/tsconfig.json`
- **Interfaces provided**: `core_contracts.workspace.v1`
- **Interfaces consumed**: `IF-0-CONTRACT-1`, `specs/phase-plans-v1.md`, `docs/omnigent-contract.md` (pre-existing)
- **Parallel-safe**: no

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-0-T1 | test | (none) | `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `packages/core-contracts/package.json` | workspace bootstrap contract | `test -f package.json && test -f pnpm-workspace.yaml && test -f tsconfig.base.json && test -f packages/core-contracts/package.json` |
| SL-0-T2 | impl | SL-0-T1 | `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, `tsconfig.json`, `eslint.config.mjs`, `vitest.config.ts`, `packages/core-contracts/package.json`, `packages/core-contracts/tsconfig.json` | n/a | n/a |
| SL-0-T3 | verify | SL-0-T2 | root workspace and `packages/core-contracts` package metadata | workspace bootstrap contract | `pnpm install --frozen-lockfile && pnpm exec tsc --showConfig -p tsconfig.json >/dev/null` |

### SL-1 - Core schema contracts and public exports

- **Scope**: Implement the runtime-neutral TypeScript types, validation schemas, redaction helpers, and public exports named by the roadmap and source spec.
- **Owned files**: `packages/core-contracts/src/index.ts`, `packages/core-contracts/src/types.ts`, `packages/core-contracts/src/provider.ts`, `packages/core-contracts/src/schemas.ts`, `packages/core-contracts/src/events.ts`, `packages/core-contracts/src/errors.ts`, `packages/core-contracts/src/handoff-packet.ts`, `packages/core-contracts/src/identity-profile.ts`, `packages/core-contracts/src/rate-limit.ts`, `packages/core-contracts/src/route-decision.ts`, `packages/core-contracts/src/worktree.ts`, `packages/core-contracts/src/redaction.ts`, `packages/core-contracts/src/schemas.test.ts`, `fixtures/core/contracts/*.json`
- **Interfaces provided**: `core_contracts.schemas.v1`, `core_contracts.public_exports.v1`
- **Interfaces consumed**: `core_contracts.workspace.v1`, `IF-0-CONTRACT-1` (pre-existing)
- **Parallel-safe**: yes

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-1-T1 | test | SL-0-T3 | `packages/core-contracts/src/schemas.test.ts`, `fixtures/core/contracts/*.json` | schema validation tests | `pnpm --filter @consiliency/runtime-provider test -- --run packages/core-contracts/src/schemas.test.ts` |
| SL-1-T2 | impl | SL-1-T1 | `packages/core-contracts/src/*.ts`, `fixtures/core/contracts/*.json` | n/a | n/a |
| SL-1-T3 | verify | SL-1-T2 | `packages/core-contracts/src/*.ts`, `fixtures/core/contracts/*.json` | schema validation tests | `pnpm --filter @consiliency/runtime-provider test -- --run packages/core-contracts/src/schemas.test.ts && pnpm --filter @consiliency/runtime-provider typecheck` |

### SL-2 - Lifecycle state machines and event fixtures

- **Scope**: Freeze and test the session/turn transition tables, runtime event ordering rules, and lifecycle documentation using the CONTRACT capability-degradation decisions.
- **Owned files**: `packages/core-contracts/src/state-machines.ts`, `packages/core-contracts/src/state-machines.test.ts`, `fixtures/core/lifecycle/*.json`, `docs/lifecycle-and-events.md`
- **Interfaces provided**: `core_contracts.lifecycle_state_machine.v1`, `core_contracts.runtime_event_fixture.v1`
- **Interfaces consumed**: `core_contracts.schemas.v1`, `core_contracts.public_exports.v1`, `IF-0-CONTRACT-1` (pre-existing)
- **Parallel-safe**: yes

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-2-T1 | test | SL-1-T3 | `packages/core-contracts/src/state-machines.test.ts`, `fixtures/core/lifecycle/*.json`, `docs/lifecycle-and-events.md` | lifecycle transition tests | `pnpm --filter @consiliency/runtime-provider test -- --run packages/core-contracts/src/state-machines.test.ts` |
| SL-2-T2 | impl | SL-2-T1 | `packages/core-contracts/src/state-machines.ts`, `fixtures/core/lifecycle/*.json`, `docs/lifecycle-and-events.md` | n/a | n/a |
| SL-2-T3 | verify | SL-2-T2 | lifecycle source, fixtures, and documentation | lifecycle transition tests | `pnpm --filter @consiliency/runtime-provider test -- --run packages/core-contracts/src/state-machines.test.ts && test -f docs/lifecycle-and-events.md` |

### SL-3 - Fake provider and fake event stream

- **Scope**: Implement the in-memory fake provider and fake event stream that prove idempotency, active-turn concurrency, replay, sequence-gap, heartbeat, cancellation, and terminal-event semantics without real Omnigent.
- **Owned files**: `packages/core-contracts/src/fake-provider.ts`, `packages/core-contracts/src/fake-event-stream.ts`, `packages/core-contracts/src/fake-provider.test.ts`, `packages/core-contracts/src/fake-event-stream.test.ts`, `fixtures/core/fake-provider/*.json`
- **Interfaces provided**: `core_contracts.fake_provider.v1`, `core_contracts.fake_event_stream.v1`
- **Interfaces consumed**: `core_contracts.schemas.v1`, `core_contracts.lifecycle_state_machine.v1`, `core_contracts.runtime_event_fixture.v1`, `IF-0-CONTRACT-1` (pre-existing)
- **Parallel-safe**: yes

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-3-T1 | test | SL-2-T3 | `packages/core-contracts/src/fake-provider.test.ts`, `packages/core-contracts/src/fake-event-stream.test.ts`, `fixtures/core/fake-provider/*.json` | fake provider behavior tests | `pnpm --filter @consiliency/runtime-provider test -- --run packages/core-contracts/src/fake-provider.test.ts packages/core-contracts/src/fake-event-stream.test.ts` |
| SL-3-T2 | impl | SL-3-T1 | `packages/core-contracts/src/fake-provider.ts`, `packages/core-contracts/src/fake-event-stream.ts`, `fixtures/core/fake-provider/*.json` | n/a | n/a |
| SL-3-T3 | verify | SL-3-T2 | fake provider source, tests, and fixtures | fake provider behavior tests | `pnpm --filter @consiliency/runtime-provider test -- --run packages/core-contracts/src/fake-provider.test.ts packages/core-contracts/src/fake-event-stream.test.ts` |

### SL-4 - Pre-closeout verification reducer

- **Scope**: Run the full code and contract checks before documentation synthesis so producer-lane defects are repaired before the terminal reducer writes public docs.
- **Owned files**: none
- **Interfaces provided**: `core_contracts.pre_closeout_verification.v1`
- **Interfaces consumed**: `core_contracts.workspace.v1`, `core_contracts.schemas.v1`, `core_contracts.public_exports.v1`, `core_contracts.lifecycle_state_machine.v1`, `core_contracts.runtime_event_fixture.v1`, `core_contracts.fake_provider.v1`, `core_contracts.fake_event_stream.v1`
- **Parallel-safe**: no

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-4-T1 | test | SL-3-T3 | full BOOTCORE producer surface | phase producer verification suite | `pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test -- --run` |
| SL-4-T2 | impl | SL-4-T1 | full BOOTCORE producer surface | n/a | n/a |
| SL-4-T3 | verify | SL-4-T2 | full BOOTCORE producer surface | phase producer verification suite | `pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test -- --run && node -e "const p=require('./packages/core-contracts/package.json'); const deps={...(p.dependencies||{}),...(p.peerDependencies||{})}; if (Object.keys(deps).some((name)=>/omnigent/i.test(name))) process.exit(1)"` |

### SL-5 - Documentation and phase verification reducer

- **Scope**: Write the root README and architecture overview after every producer lane verifies, record non-dispatch release-surface decisions including that a post-dispatch evidence reducer is not applicable, run the final suite, and make `IF-0-BOOTCORE-2` eligible for runner closeout.
- **Owned files**: `README.md`, `docs/architecture.md`
- **Interfaces provided**: `core_contracts.docs_bootstrap.v1`, `spec_delta_closeout.v1:no_spec_delta`, `automation.suite_command:bootcore-plan-verify`, `IF-0-BOOTCORE-2`
- **Interfaces consumed**: `core_contracts.workspace.v1`, `core_contracts.schemas.v1`, `core_contracts.public_exports.v1`, `core_contracts.lifecycle_state_machine.v1`, `core_contracts.runtime_event_fixture.v1`, `core_contracts.fake_provider.v1`, `core_contracts.fake_event_stream.v1`, `core_contracts.pre_closeout_verification.v1`
- **Parallel-safe**: no

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-5-T1 | test | SL-4-T3 | `README.md`, `docs/architecture.md`, `docs/lifecycle-and-events.md` | documentation presence checks | `test -f README.md && test -f docs/architecture.md && test -f docs/lifecycle-and-events.md` |
| SL-5-T2 | impl | SL-5-T1 | `README.md`, `docs/architecture.md` | n/a | n/a |
| SL-5-T3 | verify | SL-5-T2 | full BOOTCORE owned surface | phase verification suite | `test -f README.md && test -f docs/architecture.md && test -f docs/lifecycle-and-events.md && rg -n "core-contracts|IF-0-BOOTCORE-2|no real Omnigent dependency" README.md docs/architecture.md docs/lifecycle-and-events.md && pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test -- --run && node -e "const p=require('./packages/core-contracts/package.json'); const deps={...(p.dependencies||{}),...(p.peerDependencies||{})}; if (Object.keys(deps).some((name)=>/omnigent/i.test(name))) process.exit(1)" && git diff --check && phase-loop validate-roadmap specs/phase-plans-v1.md` |

## Execution Notes

- Treat `.phase-loop/` as the authoritative runner state. Legacy `.codex/phase-loop/` files are compatibility artifacts only and must not block or supersede canonical `.phase-loop/` state.
- If execution creates worktrees and `/mnt/workspace` exists, place them under `/mnt/workspace/worktrees/omniagent-plus-<branch>`.
- Start from `IF-0-CONTRACT-1`; do not infer backend behavior from Omnigent `openapi.json` alone, especially for the documented `waiting` session-status drift.
- `packages/core-contracts` must stay runtime-neutral. It may include fake-provider and fake-event-stream helpers for tests, but it must not import or depend on real Omnigent HTTP, CLI, Python packages, subprocess launchers, state ledger, coordinator, adapters, or UI code.
- Capability gaps from CONTRACT are typed core behavior, not TODO comments: logical close is emulated, child-session creation and public harness override are blocked/unavailable, malformed frames are parser-hardening cases, and duplicate upstream terminal markers normalize to exactly one terminal turn event.
- The fake provider may keep state in memory only for unit tests. Durable state, migrations, cooldowns, worktree leases, identity isolation, and route persistence belong to downstream phases.
- `SL-5` is the terminal docs and phase reducer and depends on every producer lane. It records `no_doc_delta` for `CHANGELOG`, release notes, and external release evidence surfaces because BOOTCORE does not dispatch a tag or workflow; a post-dispatch evidence reducer is not applicable in this non-dispatch phase.
- Any defect discovered by `SL-4` or `SL-5` verification must be repaired in the producing lane before closeout lists `IF-0-BOOTCORE-2`.

## Acceptance Criteria

- [ ] `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test -- --run` pass from the repo root.
- [ ] `packages/core-contracts` exports `AgentRuntimeProvider`, `AgentSession`, `TurnHandle`, `RuntimeEventEnvelope`, `HandoffPacket`, `LimitClassification`, `RouteDecision`, `RuntimeFailure`, `IdentityProfile`, and `WorktreeLease` from `packages/core-contracts/src/index.ts` with schema-backed validation tests in `packages/core-contracts/src/schemas.test.ts`.
- [ ] `packages/core-contracts/src/state-machines.test.ts` proves allowed and rejected session/turn transitions, including cancellation, approval-blocked turns, close emulation, and failure states.
- [ ] `packages/core-contracts/src/fake-provider.test.ts` proves duplicate `createSession` and `sendTurn` idempotency keys are deterministic and enforces the one-active-turn policy with `RuntimeFailure.category = "concurrency_limit"`.
- [ ] `packages/core-contracts/src/fake-event-stream.test.ts` proves replay cursors, sequence gaps, heartbeats, malformed/unknown event handling, and exactly-one terminal event normalization.
- [ ] `node -e "const p=require('./packages/core-contracts/package.json'); const deps={...(p.dependencies||{}),...(p.peerDependencies||{})}; if (Object.keys(deps).some((name)=>/omnigent/i.test(name))) process.exit(1)"` exits `0`, proving no real Omnigent dependency in the core package.
- [ ] `docs/lifecycle-and-events.md`, `README.md`, and `docs/architecture.md` describe the package boundary, lifecycle tables, fake-provider scope, and no-real-Omnigent dependency rule.
- [ ] `git status --short -- package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json tsconfig.json eslint.config.mjs vitest.config.ts packages/core-contracts fixtures/core docs/lifecycle-and-events.md README.md docs/architecture.md` shows only BOOTCORE-owned paths before runner closeout.

## Verification

- automation.suite_command: `pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test -- --run && node -e "const p=require('./packages/core-contracts/package.json'); const deps={...(p.dependencies||{}),...(p.peerDependencies||{})}; if (Object.keys(deps).some((name)=>/omnigent/i.test(name))) process.exit(1)" && git diff --check && phase-loop validate-roadmap specs/phase-plans-v1.md`
- Lane checks: run the `verify` command from each lane after its implementation task.
- Whole-phase dirty-path check: `git status --short -- package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json tsconfig.json eslint.config.mjs vitest.config.ts packages/core-contracts fixtures/core docs/lifecycle-and-events.md README.md docs/architecture.md`
- Closeout gate: list `IF-0-BOOTCORE-2` in `produced_if_gates` only after the automation suite passes and the dirty-path check contains only active-plan owned files.
