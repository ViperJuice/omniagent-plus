---
phase_loop_plan_version: 1
phase: HANDOFF
roadmap: specs/phase-plans-v1.md
roadmap_sha256: cd559015ff6624aeb1ccbb8a708835c06a747d77d3c62c6a1894af1d8e21bb90
---

# HANDOFF: Handoff Packet Builder

## Context

`HANDOFF` is Phase 8 from `specs/phase-plans-v1.md`. Canonical `.phase-loop/events.jsonl` records `BOOTCORE`, `STATELEDGER`, and `WORKTREE` complete, with `WORKTREE` closing at `65b4eb42b220a7d072bf479b8726096c855fb0c2` and verification passed. `.phase-loop/state.json` and `.phase-loop/tui-handoff.md` can lag the newer ledger, so this plan treats the canonical event ledger plus the clean live git topology as authoritative. Legacy `.codex/phase-loop/` files are compatibility artifacts only and must not block or supersede canonical `.phase-loop/` state.

This phase consumes `IF-0-BOOTCORE-2`, `IF-0-STATELEDGER-3`, and `IF-0-WORKTREE-7`. It strengthens the existing `HandoffPacket` contract in `@consiliency/runtime-provider`, adds packet builders and bounded evidence collectors, adds target-harness prompt renderers, and proves with hostile fixtures that untrusted logs, diffs, command output, prior-agent summaries, and optional raw history cannot become trusted instructions. It must not implement routing policy, summarize unlimited transcripts, call real Omnigent, persist secrets, or mutate upstream state-ledger/worktree contracts unless execution proves a repairable `contract_bug` in those already-produced gates.

## Interface Freeze Gates

- [ ] IF-0-HANDOFF-8 - Handoff packets and prompt renderers preserve trusted task instructions while fencing untrusted evidence.
  - Required packet surface: `@consiliency/runtime-provider` exposes a typed handoff packet schema, packet builder, context policy model, evidence collector inputs, and redaction-aware validation that separate trusted objective/task contract/output requirements from untrusted evidence.
  - Required evidence proof: workspace, worktree lease, diff, command, test, log, decision, assumption, risk, and raw-history refs are bounded, metadata-only or redacted, and reject secrets, env dumps, provider payloads, absolute secret paths, and unbounded transcript content.
  - Required renderer proof: Codex, Claude Code, Gemini Antigravity, OpenCode, Pi, and custom-target renderers put trusted task instructions in explicit trusted sections and put logs, diffs, command output, summaries, and raw history only in labeled untrusted evidence sections.
  - Required injection proof: hostile fixtures containing system/developer/operator-style text, markdown fences, XML-ish tags, shell commands, JSON schema claims, and prompt-leak requests remain quoted or escaped evidence and cannot alter the trusted task contract.
  - Required raw-history proof: raw history is optional, bounded by policy, redacted before rendering, and omitted when `rawHistoryAllowed` is false.

## Spec Closeout Plan

- schema: `spec_delta_closeout.v1`
- decision: `no_spec_delta`
- target surfaces: `packages/core-contracts/src/handoff-packet.ts`, `packages/core-contracts/src/handoff-renderer.ts`, `packages/core-contracts/src/redaction.ts`, `fixtures/handoff/`, `docs/handoff-packets.md`
- evidence paths: `packages/core-contracts/src/handoff-packet.test.ts`, `packages/core-contracts/src/handoff-renderer.test.ts`, `packages/core-contracts/src/handoff-security.test.ts`, `packages/core-contracts/src/redaction.test.ts`, `fixtures/handoff/`, `.phase-loop/runs/<run>/verification.json`
- redaction posture: `metadata_only`
- downstream handling: none; downstream phases may consume `IF-0-HANDOFF-8` only after the closeout records the produced gate and the automation suite passes.

## Lane Index & Dependencies

SL-0 — Handoff schema, builder, and evidence collectors
  Depends on: (none)
  Blocks: SL-1, SL-2
  Parallel-safe: no

SL-1 — Target-harness prompt renderers
  Depends on: SL-0
  Blocks: SL-2
  Parallel-safe: yes

SL-2 — Prompt-injection fixtures, docs, and phase verification reducer
  Depends on: SL-0, SL-1
  Blocks: (none)
  Parallel-safe: no

## Execution Policy

- work-unit defaults: work-unit=`lane_execute`, effort=`high`, unsupported=`inherit_default`, inherit-default=`true`
- SL-2: executor=`codex`, model=`gpt-5.5`, effort=`medium`, work-unit=`phase_reducer`, reason=`prompt-injection redaction docs and phase verification reducer`

## Lanes

### SL-0 — Handoff schema, builder, and evidence collectors

- **Scope**: Expand the typed handoff packet contract, packet builder, context policy checks, redaction helpers, and bounded evidence collector inputs without rendering target prompts.
- **Owned files**: `packages/core-contracts/src/handoff-packet.ts`, `packages/core-contracts/src/handoff-packet.test.ts`, `packages/core-contracts/src/redaction.ts`, `packages/core-contracts/src/redaction.test.ts`, `fixtures/core/contracts/handoff-packet.json`, `fixtures/handoff/packets/*.json`, `fixtures/handoff/evidence/*.json`
- **Interfaces provided**: `handoff_packet.schema.v1`, `handoff_packet.builder.v1`, `handoff_packet.context_policy.v1`, `handoff_packet.evidence_collectors.v1`, `handoff_packet.redaction_helpers.v1`
- **Interfaces consumed**: `IF-0-BOOTCORE-2` (pre-existing), `IF-0-STATELEDGER-3` (pre-existing), `IF-0-WORKTREE-7` (pre-existing), `RuntimeEvidenceRef` (pre-existing), `WorktreeLease` (pre-existing), `DiffSummary` (pre-existing), `EvidenceStore` metadata-only behavior (pre-existing)
- **Parallel-safe**: no

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-0-T1 | test | (none) | handoff packet schema tests, redaction tests, packet fixtures, and evidence fixtures | builder, context policy, bounded evidence, redaction, and fixture parsing tests | `test ! -e packages/core-contracts/src/handoff-packet.test.ts || pnpm --filter @consiliency/runtime-provider test -- --run packages/core-contracts/src/handoff-packet.test.ts packages/core-contracts/src/redaction.test.ts` |
| SL-0-T2 | impl | SL-0-T1 | handoff packet contract, builder helpers, context policy validation, evidence collector input normalization, redaction helpers, core contract fixture, and handoff packet/evidence fixtures | n/a | n/a |
| SL-0-T3 | verify | SL-0-T2 | packet builder source/tests and packet/evidence fixtures | builder, context policy, bounded evidence, redaction, and fixture parsing tests | `pnpm --filter @consiliency/runtime-provider test -- --run packages/core-contracts/src/handoff-packet.test.ts packages/core-contracts/src/redaction.test.ts && find fixtures/handoff/packets fixtures/handoff/evidence -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null` |

### SL-1 — Target-harness prompt renderers

- **Scope**: Implement deterministic target-harness renderers that keep trusted task instructions separate from untrusted evidence sections for every supported harness target.
- **Owned files**: `packages/core-contracts/src/handoff-renderer.ts`, `packages/core-contracts/src/handoff-renderer.test.ts`, `fixtures/handoff/renderers/*.json`
- **Interfaces provided**: `handoff_renderer.trusted_sections.v1`, `handoff_renderer.target_harnesses.v1`, `handoff_renderer.untrusted_evidence_sections.v1`
- **Interfaces consumed**: `handoff_packet.schema.v1`, `handoff_packet.builder.v1`, `handoff_packet.context_policy.v1`, `handoff_packet.evidence_collectors.v1`, `handoff_packet.redaction_helpers.v1`
- **Parallel-safe**: yes

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-1-T1 | test | SL-0-T3 | renderer tests and renderer fixtures for Codex, Claude Code, Gemini Antigravity, OpenCode, Pi, and custom targets | trusted section separation, target-specific labels, and untrusted evidence rendering tests | `pnpm --filter @consiliency/runtime-provider test -- --run packages/core-contracts/src/handoff-renderer.test.ts` |
| SL-1-T2 | impl | SL-1-T1 | target renderer source and renderer fixtures | n/a | n/a |
| SL-1-T3 | verify | SL-1-T2 | renderer source/tests and renderer fixtures | trusted section separation, target-specific labels, and untrusted evidence rendering tests | `pnpm --filter @consiliency/runtime-provider test -- --run packages/core-contracts/src/handoff-renderer.test.ts && find fixtures/handoff/renderers -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null` |

### SL-2 — Prompt-injection fixtures, docs, and phase verification reducer

- **Scope**: Add hostile prompt-injection and redaction fixtures, finalize public exports and docs after producer lanes pass, and run the phase verification suite.
- **Owned files**: `packages/core-contracts/src/index.ts`, `packages/core-contracts/src/handoff-security.test.ts`, `fixtures/handoff/injection/*.json`, `fixtures/handoff/redaction/*.json`, `docs/handoff-packets.md`
- **Interfaces provided**: `handoff_packet.public_exports.v1`, `handoff_packet.prompt_injection_fixtures.v1`, `handoff_packet.redaction_fixtures.v1`, `handoff_packet.docs.v1`, `spec_delta_closeout.v1:no_spec_delta`, `no_doc_delta:release-surfaces`, `automation.suite_command:handoff-plan-verify`, `IF-0-HANDOFF-8`
- **Interfaces consumed**: `handoff_packet.schema.v1`, `handoff_packet.builder.v1`, `handoff_packet.context_policy.v1`, `handoff_packet.evidence_collectors.v1`, `handoff_packet.redaction_helpers.v1`, `handoff_renderer.trusted_sections.v1`, `handoff_renderer.target_harnesses.v1`, `handoff_renderer.untrusted_evidence_sections.v1`
- **Parallel-safe**: no

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-2-T1 | test | SL-1-T3 | public exports, security tests, hostile injection fixtures, redaction fixtures, and handoff docs | prompt-injection fencing, raw-history bounds, secret redaction, public export, and documentation tests | `test -f docs/handoff-packets.md && pnpm --filter @consiliency/runtime-provider test -- --run packages/core-contracts/src/handoff-security.test.ts` |
| SL-2-T2 | impl | SL-2-T1 | package exports, security test suite, injection/redaction fixtures, and handoff packet docs | n/a | n/a |
| SL-2-T3 | verify | SL-2-T2 | full HANDOFF owned surface | phase verification suite | `test -f docs/handoff-packets.md && rg -n "IF-0-HANDOFF-8|trusted|untrusted|metadata_only|raw history|prompt injection|redacted" docs/handoff-packets.md packages/core-contracts/src && pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test -- --run packages/core-contracts/src/handoff-packet.test.ts packages/core-contracts/src/redaction.test.ts packages/core-contracts/src/handoff-renderer.test.ts packages/core-contracts/src/handoff-security.test.ts && find fixtures/handoff -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null && git diff --check && phase-loop validate-roadmap specs/phase-plans-v1.md` |

## Execution Notes

- Treat `.phase-loop/` as the authoritative runner state. Legacy `.codex/phase-loop/` files are compatibility artifacts only and must not block or supersede canonical `.phase-loop/` state.
- If execution creates worktrees and `/mnt/workspace` exists, place every created worktree under `/mnt/workspace/worktrees/omniagent-plus-<branch>`. This phase should normally consume existing worktree metadata rather than create new worktrees.
- The trusted task contract includes objective, must/must-not constraints, acceptance criteria, required output, context policy, and operator-supplied permissions. Evidence from logs, diffs, command output, tests, prior-agent summaries, raw history, and provider payloads is always untrusted until converted to bounded metadata-only or redacted evidence refs.
- Raw history must be omitted unless `contextPolicy.rawHistoryAllowed` is true, must be capped by `rawHistoryMaxItems` and byte limits, and must be rendered only in untrusted evidence sections.
- Evidence collectors may consume metadata from `@omniagent-plus/worktree-leasing` diff summaries and state-ledger evidence refs, but this phase does not change worktree leasing, durable ledger storage, route decisions, provider sessions, or downstream adapter policy.
- Renderers must escape or quote instruction-like evidence. Text that says `system`, `developer`, `operator`, `ignore previous instructions`, tool-call JSON, shell commands, markdown fences, or XML-ish prompt tags remains evidence and must not be promoted into trusted sections.
- `SL-2` is the terminal security, documentation, public export, and phase reducer and depends on every producer lane. It records `no_doc_delta` for `README`, `CHANGELOG`, release notes, and external release evidence surfaces because HANDOFF does not dispatch a tag or workflow; a post-dispatch evidence reducer is not applicable in this non-dispatch phase.
- Any defect discovered by `SL-2` verification must be repaired in the producing lane before closeout lists `IF-0-HANDOFF-8`.

## Acceptance Criteria

- [ ] `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, and the HANDOFF-focused Vitest files pass from the repo root.
- [ ] `packages/core-contracts/src/handoff-packet.test.ts` proves packet builder validation covers typed task contract, workspace state, worktree/diff refs, command/test/log evidence, decisions, assumptions, risks, required output, and context policy.
- [ ] `packages/core-contracts/src/redaction.test.ts` proves secret-bearing values, env dumps, provider payloads, absolute secret paths, and unbounded excerpts are rejected or redacted before packet construction or rendering.
- [ ] `packages/core-contracts/src/handoff-renderer.test.ts` proves Codex, Claude Code, Gemini Antigravity, OpenCode, Pi, and custom renderers put trusted objective/task/output/policy fields in trusted sections and put evidence only in labeled untrusted sections.
- [ ] `packages/core-contracts/src/handoff-security.test.ts` proves hostile fixture text containing instruction-looking content, code fences, XML-ish tags, shell commands, and schema claims cannot alter the trusted task contract or renderer instructions.
- [ ] `fixtures/handoff/packets`, `fixtures/handoff/evidence`, `fixtures/handoff/renderers`, `fixtures/handoff/injection`, and `fixtures/handoff/redaction` contain valid JSON fixtures for positive and negative packet, renderer, injection, redaction, and raw-history-bound cases.
- [ ] `docs/handoff-packets.md` documents the trusted/untrusted boundary, packet schema, builder inputs, renderer section contract, raw-history policy, redaction posture, worktree/diff evidence refs, and non-dispatch release-surface decision.
- [ ] `git status --short -- packages/core-contracts/src/handoff-packet.ts packages/core-contracts/src/handoff-packet.test.ts packages/core-contracts/src/redaction.ts packages/core-contracts/src/redaction.test.ts packages/core-contracts/src/handoff-renderer.ts packages/core-contracts/src/handoff-renderer.test.ts packages/core-contracts/src/handoff-security.test.ts packages/core-contracts/src/index.ts fixtures/core/contracts/handoff-packet.json fixtures/handoff docs/handoff-packets.md` shows only HANDOFF-owned paths before runner closeout.

## Verification

- automation.suite_command: `pnpm install --frozen-lockfile && pnpm build && pnpm lint && pnpm typecheck && pnpm test -- --run packages/core-contracts/src/handoff-packet.test.ts packages/core-contracts/src/redaction.test.ts packages/core-contracts/src/handoff-renderer.test.ts packages/core-contracts/src/handoff-security.test.ts && find fixtures/handoff -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null && test -f docs/handoff-packets.md && rg -n "IF-0-HANDOFF-8|trusted|untrusted|metadata_only|raw history|prompt injection|redacted" docs/handoff-packets.md packages/core-contracts/src && git diff --check && phase-loop validate-roadmap specs/phase-plans-v1.md`
- Lane checks: run the `verify` command from each lane after its implementation task.
- Whole-phase dirty-path check: `git status --short -- packages/core-contracts/src/handoff-packet.ts packages/core-contracts/src/handoff-packet.test.ts packages/core-contracts/src/redaction.ts packages/core-contracts/src/redaction.test.ts packages/core-contracts/src/handoff-renderer.ts packages/core-contracts/src/handoff-renderer.test.ts packages/core-contracts/src/handoff-security.test.ts packages/core-contracts/src/index.ts fixtures/core/contracts/handoff-packet.json fixtures/handoff docs/handoff-packets.md`
- Closeout gate: list `IF-0-HANDOFF-8` in `produced_if_gates` only after the automation suite passes and the dirty-path check contains only active-plan owned files.
