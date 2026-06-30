---
phase_loop_plan_version: 1
phase: IDENTITY
roadmap: specs/phase-plans-v1.md
roadmap_sha256: cd559015ff6624aeb1ccbb8a708835c06a747d77d3c62c6a1894af1d8e21bb90
---

# IDENTITY: Identity Isolation

## Context

`IDENTITY` is Phase 6 from `specs/phase-plans-v1.md`. Canonical `.phase-loop/events.jsonl` records `CONTRACT`, `BOOTCORE`, `STATELEDGER`, `TRANSPORT`, and `LIMITS` complete, with `LIMITS` committed at `42db71eba082bb7658bd8c7dd7fa41acd82142f6`; `.phase-loop/state.json` and `.phase-loop/tui-handoff.md` still show older LIMITS planning state. This plan treats the newer canonical ledger plus live git topology as authoritative and does not use legacy `.codex/phase-loop/` state to block or supersede it.

This phase consumes `IF-0-CONTRACT-1`, `IF-0-BOOTCORE-2`, `IF-0-STATELEDGER-3`, and `IF-0-TRANSPORT-4`. It adds a real `@omniagent-plus/identity-isolation` package that loads and preflights identity profiles, builds bounded profile environments, rejects raw secret values, records metadata-only identity status, and gates Omnigent shared HTTP usage behind explicit per-session auth isolation evidence. It must not create provider accounts, automate billing or subscription management, implement global route selection, or persist API keys, OAuth tokens, bearer tokens, auth files, full env dumps, raw provider payloads, unbounded transcripts, or secret-bearing diagnostics.

## Interface Freeze Gates

- [ ] IF-0-IDENTITY-6 - Identity profiles, env allowlists, secret refs, isolated homes, and Omnigent process isolation rules prevent auth bleed.
  - Required package surface: `@omniagent-plus/identity-isolation` exports profile loader, preflight, environment builder, secret-leak scanner, profile-status store, Omnigent isolation policy, and public gate constant APIs built on `IdentityProfile`, `SecretRef`, `RedactedConfigValue`, `IdentityProfileStatus`, `AuditLedger`, and the transport provider modes.
  - Required profile proof: fixtures and tests cover isolated home, env allowlists, secret refs, auth-volume refs by id, process profile metadata, network policy, tool policy refs, provider/harness ids, max session/turn limits, cooldowns, and profile listing without reading or storing secret values.
  - Required host-env proof: `host_env` is accepted only for development profiles with an explicit non-empty env allowlist; production/shared profiles using `host_env` fail preflight with a typed identity-profile failure and metadata-only diagnostics.
  - Required redaction proof: raw secret strings, bearer tokens, API keys, auth headers, password/token/credential fields, secret file contents, full env dumps, raw events, handoff packets, route decisions, and ledger records are rejected or reduced to `RedactedConfigValue`/metadata-only evidence before persistence.
  - Required Omnigent process proof: shared HTTP/server mode is blocked unless frozen contract evidence explicitly proves per-session `$HOME`, environment, credential, and auth-volume isolation; without that proof, CLI and hybrid launch policy requires one process profile per active identity with isolated `HOME`, env allowlist, auth-volume ref, and process metadata.
  - Required concurrency proof: tests run two profiles concurrently and prove env, home directory, auth-volume refs, profile status records, and Omnigent process profiles cannot cross between identities.

## Spec Closeout Plan

- schema: `spec_delta_closeout.v1`
- decision: `no_spec_delta`
- target surfaces: `packages/identity-isolation/`, `fixtures/identity/`, `docs/identity-isolation.md`, `docs/security-and-secrets.md`
- evidence paths: `packages/identity-isolation/src/**/*.test.ts`, `fixtures/identity/`, `.phase-loop/runs/<run>/verification.json`
- redaction posture: `metadata_only`
- downstream handling: none; downstream phases may consume `IF-0-IDENTITY-6` only after the closeout records the produced gate and the automation suite passes.

## Lane Index & Dependencies

SL-0 — Identity package boundary and profile loader
  Depends on: (none)
  Blocks: SL-1, SL-2, SL-3
  Parallel-safe: no

SL-1 — Env allowlist, redaction, and preflight status
  Depends on: SL-0
  Blocks: SL-2, SL-3
  Parallel-safe: yes

SL-2 — Omnigent isolation policy and concurrent profile proof
  Depends on: SL-0, SL-1
  Blocks: SL-3
  Parallel-safe: yes

SL-3 — Public exports, docs, and phase verification reducer
  Depends on: SL-0, SL-1, SL-2
  Blocks: (none)
  Parallel-safe: no

## Execution Policy

- work-unit defaults: work-unit=`lane_execute`, effort=`high`, unsupported=`inherit_default`, inherit-default=`true`
- SL-3: executor=`codex`, model=`gpt-5.5`, effort=`medium`, work-unit=`phase_reducer`, reason=`public exports docs and phase verification reducer`

## Lanes

### SL-0 — Identity package boundary and profile loader

- **Scope**: Add the identity-isolation package boundary, shared identity types, config-loader entry points, and profile fixtures without implementing redaction, preflight, or Omnigent launch policy.
- **Owned files**: `pnpm-lock.yaml`, `packages/identity-isolation/package.json`, `packages/identity-isolation/tsconfig.json`, `packages/identity-isolation/src/types.ts`, `packages/identity-isolation/src/profile-loader.ts`, `packages/identity-isolation/src/profile-loader.test.ts`, `fixtures/identity/profiles/*.json`
- **Interfaces provided**: `identity_isolation.package.v1`, `identity_isolation.types.v1`, `identity_isolation.profile_loader.v1`, `identity_isolation.profile_fixtures.v1`
- **Interfaces consumed**: `IF-0-BOOTCORE-2`, `packages/core-contracts/src/identity-profile.ts`, `packages/core-contracts/src/redaction.ts`, `specs/phase-plans-v1.md`, `specs/agent-runtime-provider-omnigent-spec.md` (pre-existing)
- **Parallel-safe**: no

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-0-T1 | test | (none) | package metadata, profile loader tests, and profile fixtures | profile loader and package contract tests | `test ! -e packages/identity-isolation/package.json || pnpm --filter @omniagent-plus/identity-isolation test -- --run packages/identity-isolation/src/profile-loader.test.ts` |
| SL-0-T2 | impl | SL-0-T1 | package metadata, lockfile, tsconfig, shared types, profile loader, and profile fixtures | n/a | n/a |
| SL-0-T3 | verify | SL-0-T2 | package boundary and profile loader source/tests/fixtures | profile loader and package contract tests | `pnpm install --frozen-lockfile && pnpm --filter @omniagent-plus/identity-isolation test -- --run packages/identity-isolation/src/profile-loader.test.ts && pnpm --filter @omniagent-plus/identity-isolation typecheck && find fixtures/identity/profiles -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null` |

### SL-1 — Env allowlist, redaction, and preflight status

- **Scope**: Implement profile environment construction, raw-secret leak scanning, fail-closed preflight, and metadata-only identity status persistence through the durable state ledger.
- **Owned files**: `packages/identity-isolation/src/environment.ts`, `packages/identity-isolation/src/environment.test.ts`, `packages/identity-isolation/src/secret-redaction.ts`, `packages/identity-isolation/src/secret-redaction.test.ts`, `packages/identity-isolation/src/preflight.ts`, `packages/identity-isolation/src/preflight.test.ts`, `packages/identity-isolation/src/status-store.ts`, `packages/identity-isolation/src/status-store.test.ts`, `fixtures/identity/env/*.json`, `fixtures/identity/leak-cases/*.json`
- **Interfaces provided**: `identity_isolation.environment_builder.v1`, `identity_isolation.secret_leak_scanner.v1`, `identity_isolation.profile_preflight.v1`, `identity_isolation.status_store.v1`
- **Interfaces consumed**: `identity_isolation.package.v1`, `identity_isolation.types.v1`, `identity_isolation.profile_loader.v1`, `identity_isolation.profile_fixtures.v1`, `IF-0-BOOTCORE-2`, `IF-0-STATELEDGER-3`, `AuditLedger.appendIdentityProfileStatus` (pre-existing)
- **Parallel-safe**: yes

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-1-T1 | test | SL-0-T3 | environment, redaction, preflight, status-store tests, and env/leak fixtures | env allowlist, secret leak, preflight, and ledger status tests | `pnpm --filter @omniagent-plus/identity-isolation test -- --run packages/identity-isolation/src/environment.test.ts packages/identity-isolation/src/secret-redaction.test.ts packages/identity-isolation/src/preflight.test.ts packages/identity-isolation/src/status-store.test.ts` |
| SL-1-T2 | impl | SL-1-T1 | environment builder, secret scanner, preflight, status store, and fixtures | n/a | n/a |
| SL-1-T3 | verify | SL-1-T2 | env/redaction/preflight/status source/tests and fixtures | env allowlist, secret leak, preflight, and ledger status tests | `pnpm --filter @omniagent-plus/identity-isolation test -- --run packages/identity-isolation/src/environment.test.ts packages/identity-isolation/src/secret-redaction.test.ts packages/identity-isolation/src/preflight.test.ts packages/identity-isolation/src/status-store.test.ts && find fixtures/identity/env fixtures/identity/leak-cases -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null` |

### SL-2 — Omnigent isolation policy and concurrent profile proof

- **Scope**: Enforce Omnigent per-profile launch policy, block shared HTTP absent explicit isolation evidence, and prove concurrent profiles cannot share env, home, auth-volume, or process metadata.
- **Owned files**: `packages/identity-isolation/src/omnigent-isolation-policy.ts`, `packages/identity-isolation/src/omnigent-isolation-policy.test.ts`, `packages/identity-isolation/src/process-profile.ts`, `packages/identity-isolation/src/process-profile.test.ts`, `packages/identity-isolation/src/concurrent-isolation.test.ts`, `fixtures/identity/omnigent-isolation/*.json`, `fixtures/identity/concurrency/*.json`
- **Interfaces provided**: `identity_isolation.omnigent_policy.v1`, `identity_isolation.process_profile.v1`, `identity_isolation.concurrent_proof.v1`
- **Interfaces consumed**: `identity_isolation.environment_builder.v1`, `identity_isolation.secret_leak_scanner.v1`, `identity_isolation.profile_preflight.v1`, `IF-0-CONTRACT-1`, `IF-0-TRANSPORT-4`, `OmnigentProviderMode`, `OmnigentCapabilitySnapshot`, `docs/omnigent-contract.md` (pre-existing)
- **Parallel-safe**: yes

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-2-T1 | test | SL-1-T3 | Omnigent policy, process-profile, concurrent-isolation tests, and isolation fixtures | Omnigent process isolation and concurrent identity tests | `pnpm --filter @omniagent-plus/identity-isolation test -- --run packages/identity-isolation/src/omnigent-isolation-policy.test.ts packages/identity-isolation/src/process-profile.test.ts packages/identity-isolation/src/concurrent-isolation.test.ts` |
| SL-2-T2 | impl | SL-2-T1 | Omnigent isolation policy, process profile builder, concurrent proof tests, and fixtures | n/a | n/a |
| SL-2-T3 | verify | SL-2-T2 | Omnigent policy/process/concurrency source/tests and fixtures | Omnigent process isolation and concurrent identity tests | `pnpm --filter @omniagent-plus/identity-isolation test -- --run packages/identity-isolation/src/omnigent-isolation-policy.test.ts packages/identity-isolation/src/process-profile.test.ts packages/identity-isolation/src/concurrent-isolation.test.ts && find fixtures/identity/omnigent-isolation fixtures/identity/concurrency -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null` |

### SL-3 — Public exports, docs, and phase verification reducer

- **Scope**: Publish the identity-isolation public API, document identity and secret handling, record the non-dispatch spec closeout decision, and run the final phase suite after every producer lane passes.
- **Owned files**: `packages/identity-isolation/src/index.ts`, `packages/identity-isolation/src/phase-verification.test.ts`, `docs/identity-isolation.md`, `docs/security-and-secrets.md`
- **Interfaces provided**: `identity_isolation.public_exports.v1`, `identity_isolation.docs.v1`, `spec_delta_closeout.v1:no_spec_delta`, `no_doc_delta:release-surfaces`, `automation.suite_command:identity-plan-verify`, `IF-0-IDENTITY-6`
- **Interfaces consumed**: `identity_isolation.package.v1`, `identity_isolation.types.v1`, `identity_isolation.profile_loader.v1`, `identity_isolation.profile_fixtures.v1`, `identity_isolation.environment_builder.v1`, `identity_isolation.secret_leak_scanner.v1`, `identity_isolation.profile_preflight.v1`, `identity_isolation.status_store.v1`, `identity_isolation.omnigent_policy.v1`, `identity_isolation.process_profile.v1`, `identity_isolation.concurrent_proof.v1`
- **Parallel-safe**: no

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-3-T1 | test | SL-2-T3 | public exports, docs, and phase verification test | export, documentation, and phase verification tests | `test -f docs/identity-isolation.md && test -f docs/security-and-secrets.md && pnpm --filter @omniagent-plus/identity-isolation test -- --run packages/identity-isolation/src/phase-verification.test.ts` |
| SL-3-T2 | impl | SL-3-T1 | identity-isolation public exports, phase verification test, identity docs, and security docs | n/a | n/a |
| SL-3-T3 | verify | SL-3-T2 | full IDENTITY owned surface | phase verification suite | `test -f docs/identity-isolation.md && test -f docs/security-and-secrets.md && rg -n "IF-0-IDENTITY-6|host_env|env allowlist|secret ref|RedactedConfigValue|shared HTTP|per-session|auth bleed|metadata_only" docs/identity-isolation.md docs/security-and-secrets.md packages/identity-isolation/src && pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test -- --run packages/identity-isolation/src && find fixtures/identity -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null && git diff --check && phase-loop validate-roadmap specs/phase-plans-v1.md` |

## Execution Notes

- Treat `.phase-loop/` as the authoritative runner state. Legacy `.codex/phase-loop/` files are compatibility artifacts only and must not block or supersede canonical `.phase-loop/` state.
- If execution creates worktrees and `/mnt/workspace` exists, place them under `/mnt/workspace/worktrees/omniagent-plus-<branch>`.
- `packages/core-contracts/src/identity-profile.ts`, `packages/core-contracts/src/redaction.ts`, `packages/core-contracts/src/route-decision.ts`, `packages/core-contracts/src/state-ledger.ts`, `packages/state-ledger/src/audit-ledger.ts`, `packages/omnigent-transport/src/types.ts`, `packages/omnigent-transport/src/capability-probe.ts`, and `docs/omnigent-contract.md` are read-only contract inputs for this phase. If execution discovers the existing core or transport contracts cannot represent the required identity isolation policy, stop for a `contract_bug` repair or roadmap/spec closeout amendment instead of silently changing upstream gates.
- `host_env` profiles must be development-only and must fail preflight without an explicit non-empty allowlist. No code path may copy `process.env` wholesale into a profile launch environment.
- Secret refs identify secret location metadata only. This phase must never read or persist API key, OAuth token, bearer token, auth.json, keychain material, secret file contents, full environment maps, raw provider payloads, unbounded transcripts, or secret-bearing diagnostics.
- Shared Omnigent HTTP/server mode remains blocked by default because the frozen contract does not prove per-session `$HOME`, environment, credential, and auth-volume isolation. Any future unblock requires explicit contract evidence and tests, not an implementation assumption.
- CLI and hybrid modes must produce one process profile per active identity unless the Omnigent isolation evidence says shared mode is safe. Process profile metadata may include profile id, process owner, home dir ref, auth-volume ref, network policy, and tool policy ref, but not secret values.
- `SL-3` is the terminal documentation and phase reducer and depends on every producer lane. It records `no_doc_delta` for `README`, `CHANGELOG`, release notes, and external release evidence surfaces because IDENTITY does not dispatch a tag or workflow; a post-dispatch evidence reducer is not applicable in this non-dispatch phase.
- Any defect discovered by `SL-3` verification must be repaired in the producing lane before closeout lists `IF-0-IDENTITY-6`.

## Acceptance Criteria

- [ ] `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test -- --run packages/identity-isolation/src` pass from the repo root.
- [ ] `packages/identity-isolation/src/profile-loader.test.ts` proves profile listing and parsing for isolated homes, env allowlists, secret refs, auth-volume refs by id, process metadata, network policy, tool policy refs, cooldowns, and max session/turn limits.
- [ ] `packages/identity-isolation/src/environment.test.ts` proves launch environments are allowlist-only, never copy full host env, and keep `host_env` development-only with an explicit env allowlist.
- [ ] `packages/identity-isolation/src/secret-redaction.test.ts` proves raw secrets, bearer tokens, API keys, auth headers, password/token/credential fields, secret file contents, full env dumps, raw events, handoff packets, route decisions, and ledger records are rejected or reduced to metadata-only/redacted config values.
- [ ] `packages/identity-isolation/src/preflight.test.ts` and `status-store.test.ts` prove profile availability, cooldown, degraded, blocked, and needs-auth outcomes map to `IdentityProfileStatus` records persisted through `AuditLedger.appendIdentityProfileStatus` without secret-bearing payloads.
- [ ] `packages/identity-isolation/src/omnigent-isolation-policy.test.ts` proves shared Omnigent HTTP/server mode is blocked unless explicit per-session identity evidence is present, and CLI/hybrid modes require per-profile process isolation when evidence is absent.
- [ ] `packages/identity-isolation/src/concurrent-isolation.test.ts` proves concurrent profiles cannot read each other's env keys, home dirs, auth-volume refs, status records, or process-profile metadata.
- [ ] `packages/identity-isolation/src/index.ts` exports the public loader, preflight, environment, redaction, status-store, Omnigent policy, process-profile APIs, and `identityInterfaceFreezeGate` without exporting secret-bearing raw payload helpers.
- [ ] `docs/identity-isolation.md` and `docs/security-and-secrets.md` document the profile model, host-env restrictions, secret-ref posture, redaction patterns, Omnigent shared HTTP block, per-profile process rules, and non-dispatch release-surface decision.
- [ ] `git status --short -- pnpm-lock.yaml packages/identity-isolation fixtures/identity docs/identity-isolation.md docs/security-and-secrets.md` shows only IDENTITY-owned paths before runner closeout.

## Verification

- automation.suite_command: `pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test -- --run packages/identity-isolation/src && find fixtures/identity -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null && git diff --check && phase-loop validate-roadmap specs/phase-plans-v1.md`
- Lane checks: run the `verify` command from each lane after its implementation task.
- Whole-phase dirty-path check: `git status --short -- pnpm-lock.yaml packages/identity-isolation fixtures/identity docs/identity-isolation.md docs/security-and-secrets.md`
- Closeout gate: list `IF-0-IDENTITY-6` in `produced_if_gates` only after the automation suite passes and the dirty-path check contains only active-plan owned files.
