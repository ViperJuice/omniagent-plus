---
phase_loop_plan_version: 1
phase: TRANSPORT
roadmap: specs/phase-plans-v1.md
roadmap_sha256: cd559015ff6624aeb1ccbb8a708835c06a747d77d3c62c6a1894af1d8e21bb90
---

# TRANSPORT: Omnigent Transport

## Context

`TRANSPORT` is Phase 4 from `specs/phase-plans-v1.md`. Canonical `.phase-loop/events.jsonl` records `STATELEDGER` complete at commit `25f1b474db017ed0d0fb9d5f442650165ea6ecbe` with a clean tree, while `.phase-loop/state.json` and `.phase-loop/tui-handoff.md` still show older STATELEDGER blocker text. This plan treats the newer canonical ledger plus live git topology as authoritative and does not use legacy `.codex/phase-loop/` state to block or supersede it.

This phase consumes `IF-0-CONTRACT-1` from `docs/omnigent-contract.md`, `IF-0-BOOTCORE-2` from `packages/core-contracts`, and `IF-0-STATELEDGER-3` from `packages/state-ledger`. It adds a real `@omniagent-plus/omnigent-transport` package that maps the frozen Omnigent HTTP, CLI, and hybrid transport surfaces into neutral provider sessions, turns, event streams, history, failures, limit-classification candidates, health data, and durable capability snapshots. It must not add scheduler route selection, identity-profile isolation policy, downstream adapters, UI surfaces, live Omnigent as a CI requirement, or secret-bearing persistence.

## Interface Freeze Gates

- [ ] IF-0-TRANSPORT-4 - Omnigent HTTP/CLI/hybrid transport maps the frozen contract into provider events, sessions, history, failures, and capabilities.
  - Required package surface: `@omniagent-plus/omnigent-transport` exposes HTTP, CLI, and hybrid provider constructors that satisfy `AgentRuntimeProvider` without leaking raw Omnigent payloads across public boundaries.
  - Required conformance proof: fake Omnigent server and mapper tests consume only `fixtures/omnigent/**` plus `docs/omnigent-contract.md` and prove session creation, send-turn, history read, stream events, cancel, logical close emulation, reconnect snapshot dedupe, malformed SSE skip, and duplicate terminal normalization.
  - Required capability proof: health/version/capability probes persist `OmnigentCapabilitySnapshot` records through `AuditLedger.appendCapabilitySnapshot`, including frozen degraded behavior for logical close, child-session creation, public harness override, malformed-event hardening, reconnect, and terminal-event uniqueness.
  - Required failure proof: HTTP, CLI, stream, process, disconnected-backend, unsupported-capability, auth/billing, policy, and rate-limit-like signals normalize to `RuntimeFailure` and, where applicable, `LimitClassification` candidates with redacted diagnostics only.
  - Required process proof: CLI and hybrid modes document and test process ownership, process groups, heartbeat/status probes, parent-death cleanup, timeout cleanup, and no live Omnigent requirement in CI.

## Spec Closeout Plan

- schema: `spec_delta_closeout.v1`
- decision: `no_spec_delta`
- target surfaces: `packages/omnigent-transport/`, `docs/omnigent-contract.md`, `docs/omnigent-transport.md`, `docs/architecture.md`, `README.md`
- evidence paths: `packages/omnigent-transport/src/**/*.test.ts`, `fixtures/omnigent/`, `.phase-loop/runs/<run>/verification.json`
- redaction posture: `metadata_only`
- downstream handling: none; downstream phases may consume `IF-0-TRANSPORT-4` only after the closeout records the produced gate and the automation suite passes.

## Lane Index & Dependencies

SL-0 — Transport package boundary and shared types
  Depends on: (none)
  Blocks: SL-1, SL-2, SL-3, SL-4, SL-5
  Parallel-safe: no

SL-1 — Fake Omnigent conformance and mappers
  Depends on: SL-0
  Blocks: SL-2, SL-3, SL-4, SL-5
  Parallel-safe: yes

SL-2 — HTTP provider and SSE stream client
  Depends on: SL-0, SL-1
  Blocks: SL-4, SL-5
  Parallel-safe: yes

SL-3 — CLI fallback and hybrid process manager
  Depends on: SL-0, SL-1
  Blocks: SL-4, SL-5
  Parallel-safe: yes

SL-4 — Failure, limit, and capability persistence mapping
  Depends on: SL-0, SL-1, SL-2, SL-3
  Blocks: SL-5
  Parallel-safe: yes

SL-5 — Documentation, exports, and phase verification reducer
  Depends on: SL-0, SL-1, SL-2, SL-3, SL-4
  Blocks: (none)
  Parallel-safe: no

## Execution Policy

- work-unit defaults: work-unit=`lane_execute`, effort=`high`, unsupported=`inherit_default`, inherit-default=`true`
- SL-5: executor=`codex`, model=`gpt-5.5`, effort=`medium`, work-unit=`phase_reducer`, reason=`documentation exports and phase verification reducer`

## Lanes

### SL-0 — Transport package boundary and shared types

- **Scope**: Add the transport package boundary, workspace metadata, and shared transport configuration/raw-shape types without implementing HTTP, CLI, or hybrid behavior.
- **Owned files**: `package.json`, `pnpm-lock.yaml`, `packages/omnigent-transport/package.json`, `packages/omnigent-transport/tsconfig.json`, `packages/omnigent-transport/src/types.ts`, `packages/omnigent-transport/src/types.test.ts`
- **Interfaces provided**: `omnigent_transport.package.v1`, `omnigent_transport.types.v1`
- **Interfaces consumed**: `IF-0-CONTRACT-1`, `IF-0-BOOTCORE-2`, `IF-0-STATELEDGER-3`, `specs/phase-plans-v1.md`, `docs/omnigent-contract.md` (pre-existing)
- **Parallel-safe**: no

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-0-T1 | test | (none) | `packages/omnigent-transport/src/types.test.ts`, `packages/omnigent-transport/package.json` | transport type/package contract tests | `test ! -e packages/omnigent-transport/package.json || pnpm --filter @omniagent-plus/omnigent-transport typecheck` |
| SL-0-T2 | impl | SL-0-T1 | package metadata, lockfile, transport tsconfig, and shared types | n/a | n/a |
| SL-0-T3 | verify | SL-0-T2 | `packages/omnigent-transport/package.json`, `packages/omnigent-transport/tsconfig.json`, `packages/omnigent-transport/src/types.ts`, `packages/omnigent-transport/src/types.test.ts` | transport type/package contract tests | `pnpm install --frozen-lockfile && pnpm --filter @omniagent-plus/omnigent-transport test -- --run packages/omnigent-transport/src/types.test.ts && pnpm --filter @omniagent-plus/omnigent-transport typecheck` |

### SL-1 — Fake Omnigent conformance and mappers

- **Scope**: Build the fake Omnigent server, fixture loader, and raw-to-core session/history/event mappers from the frozen contract fixtures.
- **Owned files**: `packages/omnigent-transport/src/contract-fixtures.ts`, `packages/omnigent-transport/src/fake-omnigent-server.ts`, `packages/omnigent-transport/src/event-mapper.ts`, `packages/omnigent-transport/src/history-mapper.ts`, `packages/omnigent-transport/src/conformance.test.ts`, `packages/omnigent-transport/src/event-mapper.test.ts`, `packages/omnigent-transport/src/history-mapper.test.ts`
- **Interfaces provided**: `omnigent_transport.contract_fixtures.v1`, `omnigent_transport.fake_server.v1`, `omnigent_transport.event_mapper.v1`, `omnigent_transport.history_mapper.v1`
- **Interfaces consumed**: `omnigent_transport.package.v1`, `omnigent_transport.types.v1`, `IF-0-CONTRACT-1`, `IF-0-BOOTCORE-2`, `docs/omnigent-contract.md`, `fixtures/omnigent/**` (pre-existing)
- **Parallel-safe**: yes

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-1-T1 | test | SL-0-T3 | mapper tests, fake-server conformance tests, and frozen Omnigent fixtures | fake Omnigent conformance and mapper tests | `pnpm --filter @omniagent-plus/omnigent-transport test -- --run packages/omnigent-transport/src/conformance.test.ts packages/omnigent-transport/src/event-mapper.test.ts packages/omnigent-transport/src/history-mapper.test.ts` |
| SL-1-T2 | impl | SL-1-T1 | fake server, fixture loader, session/history/event mappers, and tests | n/a | n/a |
| SL-1-T3 | verify | SL-1-T2 | fake server, fixture loader, session/history/event mappers, tests, and `fixtures/omnigent/**` | fake Omnigent conformance and mapper tests | `pnpm --filter @omniagent-plus/omnigent-transport test -- --run packages/omnigent-transport/src/conformance.test.ts packages/omnigent-transport/src/event-mapper.test.ts packages/omnigent-transport/src/history-mapper.test.ts && find fixtures/omnigent -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null` |

### SL-2 — HTTP provider and SSE stream client

- **Scope**: Implement documented HTTP endpoints and SSE streaming as an `AgentRuntimeProvider` surface that uses only the frozen Omnigent contract.
- **Owned files**: `packages/omnigent-transport/src/http-client.ts`, `packages/omnigent-transport/src/sse-stream.ts`, `packages/omnigent-transport/src/http-provider.ts`, `packages/omnigent-transport/src/http-client.test.ts`, `packages/omnigent-transport/src/sse-stream.test.ts`, `packages/omnigent-transport/src/http-provider.test.ts`
- **Interfaces provided**: `omnigent_transport.http_client.v1`, `omnigent_transport.sse_stream.v1`, `omnigent_transport.http_provider.v1`
- **Interfaces consumed**: `omnigent_transport.package.v1`, `omnigent_transport.types.v1`, `omnigent_transport.fake_server.v1`, `omnigent_transport.event_mapper.v1`, `omnigent_transport.history_mapper.v1`, `IF-0-CONTRACT-1`, `IF-0-BOOTCORE-2` (pre-existing)
- **Parallel-safe**: yes

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-2-T1 | test | SL-1-T3 | HTTP client/provider and SSE stream tests | HTTP provider contract tests | `pnpm --filter @omniagent-plus/omnigent-transport test -- --run packages/omnigent-transport/src/http-client.test.ts packages/omnigent-transport/src/sse-stream.test.ts packages/omnigent-transport/src/http-provider.test.ts` |
| SL-2-T2 | impl | SL-2-T1 | HTTP client, SSE stream, HTTP provider, and tests | n/a | n/a |
| SL-2-T3 | verify | SL-2-T2 | HTTP client/provider and SSE stream source/tests | HTTP provider contract tests | `pnpm --filter @omniagent-plus/omnigent-transport test -- --run packages/omnigent-transport/src/http-client.test.ts packages/omnigent-transport/src/sse-stream.test.ts packages/omnigent-transport/src/http-provider.test.ts && pnpm --filter @omniagent-plus/omnigent-transport typecheck` |

### SL-3 — CLI fallback and hybrid process manager

- **Scope**: Implement documented CLI fallback commands plus hybrid local-server process ownership and cleanup without making live Omnigent mandatory in CI.
- **Owned files**: `packages/omnigent-transport/src/cli-client.ts`, `packages/omnigent-transport/src/process-manager.ts`, `packages/omnigent-transport/src/hybrid-provider.ts`, `packages/omnigent-transport/src/cli-client.test.ts`, `packages/omnigent-transport/src/process-manager.test.ts`, `packages/omnigent-transport/src/hybrid-provider.test.ts`
- **Interfaces provided**: `omnigent_transport.cli_client.v1`, `omnigent_transport.process_manager.v1`, `omnigent_transport.hybrid_provider.v1`
- **Interfaces consumed**: `omnigent_transport.package.v1`, `omnigent_transport.types.v1`, `omnigent_transport.event_mapper.v1`, `omnigent_transport.history_mapper.v1`, `IF-0-CONTRACT-1`, `IF-0-BOOTCORE-2` (pre-existing)
- **Parallel-safe**: yes

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-3-T1 | test | SL-1-T3 | CLI client, process manager, and hybrid provider tests | CLI and hybrid process tests | `pnpm --filter @omniagent-plus/omnigent-transport test -- --run packages/omnigent-transport/src/cli-client.test.ts packages/omnigent-transport/src/process-manager.test.ts packages/omnigent-transport/src/hybrid-provider.test.ts` |
| SL-3-T2 | impl | SL-3-T1 | CLI client, process manager, hybrid provider, and tests | n/a | n/a |
| SL-3-T3 | verify | SL-3-T2 | CLI client, process manager, hybrid provider source/tests | CLI and hybrid process tests | `pnpm --filter @omniagent-plus/omnigent-transport test -- --run packages/omnigent-transport/src/cli-client.test.ts packages/omnigent-transport/src/process-manager.test.ts packages/omnigent-transport/src/hybrid-provider.test.ts` |

### SL-4 — Failure, limit, and capability persistence mapping

- **Scope**: Normalize transport failures and capability gaps, derive limit-classification candidates, and persist health/version/capability snapshots through the durable state ledger.
- **Owned files**: `packages/omnigent-transport/src/failure-mapper.ts`, `packages/omnigent-transport/src/capability-probe.ts`, `packages/omnigent-transport/src/capability-store.ts`, `packages/omnigent-transport/src/failure-mapper.test.ts`, `packages/omnigent-transport/src/capability-probe.test.ts`, `packages/omnigent-transport/src/capability-store.test.ts`
- **Interfaces provided**: `omnigent_transport.failure_mapper.v1`, `omnigent_transport.limit_candidate_mapper.v1`, `omnigent_transport.capability_probe.v1`, `omnigent_transport.capability_snapshot_store.v1`
- **Interfaces consumed**: `omnigent_transport.package.v1`, `omnigent_transport.types.v1`, `omnigent_transport.fake_server.v1`, `omnigent_transport.http_provider.v1`, `omnigent_transport.cli_client.v1`, `omnigent_transport.hybrid_provider.v1`, `IF-0-BOOTCORE-2`, `IF-0-STATELEDGER-3` (pre-existing)
- **Parallel-safe**: yes

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-4-T1 | test | SL-3-T3 | failure mapper, capability probe, capability store, and ledger persistence tests | failure/capability persistence tests | `pnpm --filter @omniagent-plus/omnigent-transport test -- --run packages/omnigent-transport/src/failure-mapper.test.ts packages/omnigent-transport/src/capability-probe.test.ts packages/omnigent-transport/src/capability-store.test.ts` |
| SL-4-T2 | impl | SL-4-T1 | failure mapper, capability probe/store, limit candidate mapping, and tests | n/a | n/a |
| SL-4-T3 | verify | SL-4-T2 | failure mapper, capability probe/store, limit candidate mapping source/tests | failure/capability persistence tests | `pnpm --filter @omniagent-plus/omnigent-transport test -- --run packages/omnigent-transport/src/failure-mapper.test.ts packages/omnigent-transport/src/capability-probe.test.ts packages/omnigent-transport/src/capability-store.test.ts && pnpm --filter @omniagent-plus/state-ledger test -- --run packages/state-ledger/src/audit-ledger.test.ts` |

### SL-5 — Documentation, exports, and phase verification reducer

- **Scope**: Publish the transport package exports, document HTTP/CLI/hybrid process ownership after every producer lane passes, record non-dispatch release-surface decisions, and run the final phase suite.
- **Owned files**: `packages/omnigent-transport/src/index.ts`, `docs/omnigent-transport.md`, `docs/architecture.md`, `README.md`
- **Interfaces provided**: `omnigent_transport.public_exports.v1`, `omnigent_transport.docs.v1`, `spec_delta_closeout.v1:no_spec_delta`, `no_doc_delta:release-surfaces`, `automation.suite_command:transport-plan-verify`, `IF-0-TRANSPORT-4`
- **Interfaces consumed**: `omnigent_transport.package.v1`, `omnigent_transport.types.v1`, `omnigent_transport.contract_fixtures.v1`, `omnigent_transport.fake_server.v1`, `omnigent_transport.event_mapper.v1`, `omnigent_transport.history_mapper.v1`, `omnigent_transport.http_client.v1`, `omnigent_transport.sse_stream.v1`, `omnigent_transport.http_provider.v1`, `omnigent_transport.cli_client.v1`, `omnigent_transport.process_manager.v1`, `omnigent_transport.hybrid_provider.v1`, `omnigent_transport.failure_mapper.v1`, `omnigent_transport.limit_candidate_mapper.v1`, `omnigent_transport.capability_probe.v1`, `omnigent_transport.capability_snapshot_store.v1`
- **Parallel-safe**: no

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-5-T1 | test | SL-4-T3 | public exports, `docs/omnigent-transport.md`, `docs/architecture.md`, `README.md` | export and documentation checks | `test -f docs/omnigent-transport.md && pnpm --filter @omniagent-plus/omnigent-transport typecheck` |
| SL-5-T2 | impl | SL-5-T1 | transport public exports and docs/readme updates | n/a | n/a |
| SL-5-T3 | verify | SL-5-T2 | full TRANSPORT owned surface | phase verification suite | `test -f docs/omnigent-transport.md && rg -n "IF-0-TRANSPORT-4|HTTP|CLI|hybrid|process ownership|capability snapshot|no live Omnigent" docs/omnigent-transport.md docs/architecture.md README.md packages/omnigent-transport/src/index.ts && pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test -- --run packages/omnigent-transport/src && git diff --check && phase-loop validate-roadmap specs/phase-plans-v1.md` |

## Execution Notes

- Treat `.phase-loop/` as the authoritative runner state. Legacy `.codex/phase-loop/` files are compatibility artifacts only and must not block or supersede canonical `.phase-loop/` state.
- If execution creates worktrees and `/mnt/workspace` exists, place them under `/mnt/workspace/worktrees/omniagent-plus-<branch>`.
- `docs/omnigent-contract.md` and `fixtures/omnigent/**` are read-only contract inputs for this phase. If execution discovers contract drift, stop for a `contract_bug` repair or roadmap/spec closeout amendment instead of silently changing the frozen contract.
- The transport package must use only documented endpoints and commands from `IF-0-CONTRACT-1`: `POST /v1/sessions`, `GET /v1/sessions`, `GET/PATCH/DELETE /v1/sessions/{id}` where allowed, `GET /items`, `GET /stream`, `POST /events`, `GET /child_sessions`, `POST /fork`, `POST /switch-agent`, plus documented CLI commands such as `omnigent run`, `resume`, `attach`, and `server start/status/stop`.
- Logical close remains provider-emulated, child-session creation and public harness override remain blocked/unavailable, malformed SSE frames are parser-hardening cases, and duplicate upstream terminal markers must normalize to one terminal turn event.
- CLI and hybrid tests must use fake commands or fake servers in CI. Live Omnigent probes are opt-in only and may not be required for the automation suite.
- Persist capability snapshots through `@omniagent-plus/state-ledger` but do not persist API keys, OAuth tokens, bearer tokens, full env dumps, raw provider payloads, unbounded transcripts, or secret-bearing diagnostics.
- `SL-5` is the terminal docs and phase reducer and depends on every producer lane. It records `no_doc_delta` for `CHANGELOG`, release notes, and external release evidence surfaces because TRANSPORT does not dispatch a tag or workflow; a post-dispatch evidence reducer is not applicable in this non-dispatch phase.
- Any defect discovered by `SL-5` verification must be repaired in the producing lane before closeout lists `IF-0-TRANSPORT-4`.

## Acceptance Criteria

- [ ] `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test -- --run packages/omnigent-transport/src` pass from the repo root.
- [ ] `packages/omnigent-transport/src/conformance.test.ts`, `event-mapper.test.ts`, and `history-mapper.test.ts` prove the fake Omnigent conformance suite passes against `fixtures/omnigent/**` and `docs/omnigent-contract.md` without live Omnigent.
- [ ] `packages/omnigent-transport/src/http-client.test.ts`, `sse-stream.test.ts`, and `http-provider.test.ts` prove HTTP mode uses only documented endpoints, maps sessions/history/events into core contracts, dedupes reconnect snapshots, and implements cancel/logical close according to `IF-0-CONTRACT-1`.
- [ ] `packages/omnigent-transport/src/cli-client.test.ts`, `process-manager.test.ts`, and `hybrid-provider.test.ts` prove CLI fallback uses only documented commands/exit-code posture and hybrid mode owns process groups, heartbeat/status probes, parent-death cleanup, and timeout cleanup.
- [ ] `packages/omnigent-transport/src/capability-probe.test.ts` and `capability-store.test.ts` prove health/version/capability probes persist `OmnigentCapabilitySnapshot` records through `AuditLedger.appendCapabilitySnapshot` without persisting secret-bearing values.
- [ ] `packages/omnigent-transport/src/failure-mapper.test.ts` proves missing capabilities return typed `RuntimeFailure.category = "backend_capability_missing"`, disconnected servers return `transport` or `backend_unavailable`, and auth/billing/rate/policy-like signals produce bounded `LimitClassification` candidates where applicable.
- [ ] `packages/omnigent-transport/src/index.ts` exports the public HTTP, CLI, hybrid, capability, and failure-mapping APIs without exporting raw secret-bearing Omnigent payload types.
- [ ] `docs/omnigent-transport.md`, `docs/architecture.md`, and `README.md` document the transport boundary, fake-only CI posture, process ownership, capability snapshots, and non-dispatch release-surface decision.
- [ ] `git status --short -- package.json pnpm-lock.yaml packages/omnigent-transport docs/omnigent-transport.md docs/architecture.md README.md` shows only TRANSPORT-owned paths before runner closeout.

## Verification

- automation.suite_command: `pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test -- --run packages/omnigent-transport/src && find fixtures/omnigent -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null && git diff --check && phase-loop validate-roadmap specs/phase-plans-v1.md`
- Lane checks: run the `verify` command from each lane after its implementation task.
- Whole-phase dirty-path check: `git status --short -- package.json pnpm-lock.yaml packages/omnigent-transport docs/omnigent-transport.md docs/architecture.md README.md`
- Closeout gate: list `IF-0-TRANSPORT-4` in `produced_if_gates` only after the automation suite passes and the dirty-path check contains only active-plan owned files.
