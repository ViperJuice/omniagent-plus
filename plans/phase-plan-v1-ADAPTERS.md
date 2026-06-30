---
phase_loop_plan_version: 1
phase: ADAPTERS
roadmap: specs/phase-plans-v1.md
roadmap_sha256: cd559015ff6624aeb1ccbb8a708835c06a747d77d3c62c6a1894af1d8e21bb90
---

# ADAPTERS: Consumer Adapter Contracts

## Context

`ADAPTERS` is Phase 10 from `specs/phase-plans-v1.md`. Canonical `.phase-loop/events.jsonl` is newer than `.phase-loop/tui-handoff.md` and records `COORDINATOR` complete at commit `1d3f3aa62aca7822906b9aaa36b7c8364cdb9b77`; live git status is clean on `main` and the branch is ahead of `origin/main`. This plan treats `.phase-loop/` as the authoritative runner state. Legacy `.codex/phase-loop/` files are compatibility artifacts only and must not block or supersede canonical state.

This phase consumes `IF-0-COORDINATOR-9` and adds optional governed-pipeline and agent-harness adapter packages as leaf consumers of public `@omniagent-plus/*` contracts. The adapters map public consumer fixture shapes into provider/coordinator inputs and back into consumer-facing result metadata while preserving native policy semantics. This phase must not modify consumer repos, import private governed-pipeline or agent-harness modules, require live Omnigent, or silently downgrade selected provider, harness, model, effort, run mode, fallback, or blocker metadata.

## Interface Freeze Gates

- [ ] IF-0-ADAPTERS-10 - Governed-pipeline and agent-harness adapters consume only public contracts and preserve native policy/result semantics.
  - Required governed-pipeline surface: `@omniagent-plus/governed-pipeline-adapter` exports typed public fixtures and mapper functions for `invokeAgenticHarness` launch inputs and `executor_adapter_result.v0.1` outputs, backed only by `@omniagent-plus/core-contracts`, `@omniagent-plus/coordinator`, and JSON examples in `examples/governed-pipeline/`.
  - Required governed-pipeline proof: mapping preserves `RouteDecision.silentDowngrade = false`, fallback reason, typed blocker class, unavailable reason, selected provider/harness labels, and bounded redacted log excerpts without storing raw transcripts or secret-bearing payloads.
  - Required agent-harness surface: `@omniagent-plus/agent-harness-adapter` exports typed public fixtures and mapper functions for phase-loop launch request/result metadata, backed only by public provider contracts and JSON examples in `examples/agent-harness/`.
  - Required agent-harness proof: mapping preserves model policy, reasoning effort, run mode, dry-run/event-mode distinction, unavailable reason, selected executor, fallback reason, and verification/terminal status semantics without inventing private phase-loop state.
  - Required dependency-direction proof: package manifests and source tests fail if either adapter imports `governed-pipeline`, `agent-harness`, repo-local private consumer paths, `.phase-loop/` runtime state, or secret-bearing env/config payloads instead of public fixtures and provider contracts.

## Spec Closeout Plan

- schema: `spec_delta_closeout.v1`
- decision: `no_spec_delta`
- target surfaces: `packages/governed-pipeline-adapter/`, `packages/agent-harness-adapter/`, `examples/governed-pipeline/`, `examples/agent-harness/`, `docs/governed-pipeline-integration.md`, `docs/agent-harness-integration.md`
- evidence paths: `packages/governed-pipeline-adapter/src/**/*.test.ts`, `packages/agent-harness-adapter/src/**/*.test.ts`, `examples/governed-pipeline/`, `examples/agent-harness/`, `.phase-loop/runs/<run>/verification.json`
- redaction posture: `metadata_only`
- downstream handling: none; downstream phases may consume `IF-0-ADAPTERS-10` only after the closeout records the produced gate and the automation suite passes.

## Lane Index & Dependencies

SL-0 — Adapter package boundaries and governed-pipeline mapper
  Depends on: (none)
  Blocks: SL-1, SL-2
  Parallel-safe: no

SL-1 — Agent-harness mapper and phase-loop metadata fixtures
  Depends on: SL-0
  Blocks: SL-2
  Parallel-safe: yes

SL-2 — Dependency-direction enforcement, docs, and phase verification reducer
  Depends on: SL-0, SL-1
  Blocks: (none)
  Parallel-safe: no

## Execution Policy

- work-unit defaults: work-unit=`lane_execute`, effort=`high`, unsupported=`inherit_default`, inherit-default=`true`
- SL-2: executor=`codex`, model=`gpt-5.5`, effort=`medium`, work-unit=`phase_reducer`, reason=`dependency direction docs and phase verification reducer`

## Lanes

### SL-0 — Adapter package boundaries and governed-pipeline mapper

- **Scope**: Add both adapter package boundaries and implement the governed-pipeline public fixture types and mapper without importing governed-pipeline internals.
- **Owned files**: `pnpm-lock.yaml`, `packages/governed-pipeline-adapter/package.json`, `packages/governed-pipeline-adapter/tsconfig.json`, `packages/governed-pipeline-adapter/src/types.ts`, `packages/governed-pipeline-adapter/src/governed-pipeline.ts`, `packages/governed-pipeline-adapter/src/index.ts`, `packages/governed-pipeline-adapter/src/governed-pipeline.test.ts`, `packages/agent-harness-adapter/package.json`, `packages/agent-harness-adapter/tsconfig.json`, `examples/governed-pipeline/*.json`
- **Interfaces provided**: `adapter.package_boundaries.v1`, `governed_pipeline_adapter.public_fixtures.v1`, `governed_pipeline_adapter.mapper.v1`, `governed_pipeline_adapter.public_exports.v1`
- **Interfaces consumed**: `IF-0-COORDINATOR-9` (pre-existing), `RouteDecision` (pre-existing), `RuntimeFailure` (pre-existing), `RuntimeEvidenceRef` (pre-existing), `coordinator.route_planner.v1` (pre-existing), `coordinator.failure_policy.v1` (pre-existing)
- **Parallel-safe**: no

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-0-T1 | test | (none) | adapter package metadata, governed-pipeline fixture tests, mapper tests, and public fixture JSON | governed-pipeline adapter fixture and mapper tests | `test ! -e packages/governed-pipeline-adapter/package.json || pnpm --filter @omniagent-plus/governed-pipeline-adapter test -- --run packages/governed-pipeline-adapter/src/governed-pipeline.test.ts` |
| SL-0-T2 | impl | SL-0-T1 | both adapter package manifests, lockfile, tsconfigs, governed-pipeline public fixture types, mapper, exports, tests, and examples | n/a | n/a |
| SL-0-T3 | verify | SL-0-T2 | adapter package boundaries plus governed-pipeline mapper source/tests/fixtures | governed-pipeline adapter fixture and mapper tests | `pnpm install --frozen-lockfile && pnpm --filter @omniagent-plus/governed-pipeline-adapter test -- --run packages/governed-pipeline-adapter/src/governed-pipeline.test.ts && pnpm --filter @omniagent-plus/governed-pipeline-adapter typecheck && find examples/governed-pipeline -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null` |

### SL-1 — Agent-harness mapper and phase-loop metadata fixtures

- **Scope**: Implement the agent-harness public fixture types and mapper inside the package boundary created by SL-0 while preserving phase-loop launch/result semantics.
- **Owned files**: `packages/agent-harness-adapter/src/types.ts`, `packages/agent-harness-adapter/src/phase-loop.ts`, `packages/agent-harness-adapter/src/index.ts`, `packages/agent-harness-adapter/src/phase-loop.test.ts`, `examples/agent-harness/*.json`
- **Interfaces provided**: `agent_harness_adapter.public_fixtures.v1`, `agent_harness_adapter.phase_loop_mapper.v1`, `agent_harness_adapter.public_exports.v1`
- **Interfaces consumed**: `adapter.package_boundaries.v1`, `IF-0-COORDINATOR-9` (pre-existing), `CreateSessionRequest` (pre-existing), `SendTurnRequest` (pre-existing), `RouteDecision` (pre-existing), `RuntimeFailure` (pre-existing), `coordinator.launch_gate.v1` (pre-existing), `coordinator.failure_policy.v1` (pre-existing)
- **Parallel-safe**: yes

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-1-T1 | test | SL-0-T3 | agent-harness fixture tests, phase-loop launch/result mapper tests, and public fixture JSON | agent-harness adapter fixture and mapper tests | `pnpm --filter @omniagent-plus/agent-harness-adapter test -- --run packages/agent-harness-adapter/src/phase-loop.test.ts` |
| SL-1-T2 | impl | SL-1-T1 | agent-harness public fixture types, phase-loop mapper, package exports, tests, and examples | n/a | n/a |
| SL-1-T3 | verify | SL-1-T2 | agent-harness mapper source/tests/fixtures | agent-harness adapter fixture and mapper tests | `pnpm --filter @omniagent-plus/agent-harness-adapter test -- --run packages/agent-harness-adapter/src/phase-loop.test.ts && pnpm --filter @omniagent-plus/agent-harness-adapter typecheck && find examples/agent-harness -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null` |

### SL-2 — Dependency-direction enforcement, docs, and phase verification reducer

- **Scope**: Add dependency-direction tests, integration documentation, and the terminal phase verification suite after both adapter mappers pass.
- **Owned files**: `packages/governed-pipeline-adapter/src/dependency-direction.test.ts`, `packages/governed-pipeline-adapter/src/phase-verification.test.ts`, `packages/agent-harness-adapter/src/dependency-direction.test.ts`, `packages/agent-harness-adapter/src/phase-verification.test.ts`, `docs/governed-pipeline-integration.md`, `docs/agent-harness-integration.md`
- **Interfaces provided**: `adapters.dependency_direction.v1`, `adapters.docs.v1`, `spec_delta_closeout.v1:no_spec_delta`, `no_doc_delta:release-surfaces`, `automation.suite_command:adapters-plan-verify`, `IF-0-ADAPTERS-10`
- **Interfaces consumed**: `adapter.package_boundaries.v1`, `governed_pipeline_adapter.public_fixtures.v1`, `governed_pipeline_adapter.mapper.v1`, `governed_pipeline_adapter.public_exports.v1`, `agent_harness_adapter.public_fixtures.v1`, `agent_harness_adapter.phase_loop_mapper.v1`, `agent_harness_adapter.public_exports.v1`
- **Parallel-safe**: no

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-2-T1 | test | SL-1-T3 | dependency-direction tests, phase verification tests, and integration docs | dependency-direction and phase verification tests | `test -f docs/governed-pipeline-integration.md && test -f docs/agent-harness-integration.md && pnpm --filter @omniagent-plus/governed-pipeline-adapter test -- --run packages/governed-pipeline-adapter/src/dependency-direction.test.ts packages/governed-pipeline-adapter/src/phase-verification.test.ts && pnpm --filter @omniagent-plus/agent-harness-adapter test -- --run packages/agent-harness-adapter/src/dependency-direction.test.ts packages/agent-harness-adapter/src/phase-verification.test.ts` |
| SL-2-T2 | impl | SL-2-T1 | dependency-direction tests, phase verification tests, governed-pipeline docs, and agent-harness docs | n/a | n/a |
| SL-2-T3 | verify | SL-2-T2 | full ADAPTERS owned surface | phase verification suite | `test -f docs/governed-pipeline-integration.md && test -f docs/agent-harness-integration.md && rg -n "IF-0-ADAPTERS-10|silent_downgrade|fallback reason|blocker|redacted|model policy|effort|dry run|unavailable reason|metadata_only" docs/governed-pipeline-integration.md docs/agent-harness-integration.md packages/governed-pipeline-adapter/src packages/agent-harness-adapter/src && pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test -- --run packages/governed-pipeline-adapter/src packages/agent-harness-adapter/src && find examples/governed-pipeline examples/agent-harness -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null && git diff --check && phase-loop validate-roadmap specs/phase-plans-v1.md` |

## Execution Notes

- Treat `.phase-loop/` as the authoritative runner state. Legacy `.codex/phase-loop/` files are compatibility artifacts only and must not block or supersede canonical `.phase-loop/` state.
- If execution creates worktrees and `/mnt/workspace` exists, place every worktree under `/mnt/workspace/worktrees/omniagent-plus-<branch>`.
- Adapter packages are optional leaf packages. They may depend on public `@omniagent-plus/core-contracts` and `@omniagent-plus/coordinator` surfaces, but must not import `governed-pipeline`, `agent-harness`, private consumer repo paths, phase-loop runtime internals, local `.phase-loop/` files, or ignored/private inputs.
- The governed-pipeline adapter must treat `invokeAgenticHarness` and `executor_adapter_result.v0.1` as public fixture shapes captured under `examples/governed-pipeline/`. If the fixture shape is insufficient to preserve `silent_downgrade = false`, fallback reason, typed blockers, or bounded redacted logs, stop for a `contract_bug` repair instead of inventing private fields.
- The agent-harness adapter must treat phase-loop launch request/result metadata as public fixture shapes captured under `examples/agent-harness/`. Dry run remains event-level execution mode metadata, not a phase closeout terminal status.
- Bounded log excerpts and unavailable reasons must pass through existing redaction helpers or metadata-only fixture fields; never persist API keys, OAuth tokens, bearer tokens, full env dumps, raw provider payloads, or unbounded transcripts.
- `SL-2` is the terminal dependency-direction, documentation, and phase reducer and depends on every producer lane. It records `no_doc_delta` for `README`, `CHANGELOG`, release notes, and external release evidence surfaces because ADAPTERS does not dispatch a tag or workflow; a post-dispatch evidence reducer is not applicable in this non-dispatch phase.
- Any defect discovered by `SL-2` verification must be repaired in the producing lane before closeout lists `IF-0-ADAPTERS-10`.

## Acceptance Criteria

- [ ] `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test -- --run packages/governed-pipeline-adapter/src packages/agent-harness-adapter/src` pass from the repo root.
- [ ] `packages/governed-pipeline-adapter/src/governed-pipeline.test.ts` and `examples/governed-pipeline/*.json` prove `invokeAgenticHarness` inputs and `executor_adapter_result.v0.1` outputs preserve selected provider/harness labels, `silent_downgrade = false`, fallback reason, typed blockers, unavailable reason, and bounded redacted log excerpts.
- [ ] `packages/agent-harness-adapter/src/phase-loop.test.ts` and `examples/agent-harness/*.json` prove phase-loop launch request/result mapping preserves model policy, effort, run mode, dry-run metadata, selected executor, fallback reason, unavailable reason, verification status, and terminal status semantics.
- [ ] `packages/governed-pipeline-adapter/src/dependency-direction.test.ts` and `packages/agent-harness-adapter/src/dependency-direction.test.ts` prove adapter package manifests and source imports reference only public `@omniagent-plus/*` packages, JSON fixtures, and allowed Node/test modules, with no imports from consumer repos or phase-loop runtime internals.
- [ ] `packages/governed-pipeline-adapter/src/phase-verification.test.ts` and `packages/agent-harness-adapter/src/phase-verification.test.ts` prove both adapters expose their interface freeze gate constants and reject secret-bearing logs, raw transcripts, unrecognized blocker classes, terminal status `dry_run`, and silent label downgrade.
- [ ] `docs/governed-pipeline-integration.md` and `docs/agent-harness-integration.md` document adapter dependency direction, public fixture contracts, preserved policy/result semantics, redaction posture, and non-dispatch release-surface decision.
- [ ] `git status --short -- pnpm-lock.yaml packages/governed-pipeline-adapter packages/agent-harness-adapter examples/governed-pipeline examples/agent-harness docs/governed-pipeline-integration.md docs/agent-harness-integration.md` shows only ADAPTERS-owned paths before runner closeout.

## Verification

- automation.suite_command: `pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test -- --run packages/governed-pipeline-adapter/src packages/agent-harness-adapter/src && find examples/governed-pipeline examples/agent-harness -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null && git diff --check && phase-loop validate-roadmap specs/phase-plans-v1.md`
- Lane checks: run the `verify` command from each lane after its implementation task.
- Whole-phase dirty-path check: `git status --short -- pnpm-lock.yaml packages/governed-pipeline-adapter packages/agent-harness-adapter examples/governed-pipeline examples/agent-harness docs/governed-pipeline-integration.md docs/agent-harness-integration.md`
- Closeout gate: list `IF-0-ADAPTERS-10` in `produced_if_gates` only after the automation suite passes and the dirty-path check contains only active-plan owned files.
