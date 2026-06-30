# Phase roadmap v1

## Context

`omniagent-plus` is the working repo for the `agent-runtime-provider-omnigent`
spec and first implementation. The revised source spec is
`specs/agent-runtime-provider-omnigent-spec.md`; it was updated after advisor
panel review to make Omnigent compatibility, lifecycle semantics, durable state,
identity isolation, worktree locking, and adapter dependency direction hard
gates.

The roadmap is intentionally full-depth. It does not stop after the first
implementation slice. Later phases are blocked by explicit interface-freeze
gates so planning and execution can proceed without pretending unknown Omnigent
behavior is already known.

## Architecture North Star

The project should become a TypeScript-first provider layer around Omnigent,
with Omnigent treated as an external runtime backend. The provider owns stable
contracts, durable local state, routing policy, identity/worktree safety, and
optional adapters. It must not import `governed-pipeline` or `agent-harness`
internals.

The north-star architecture is:

```text
consumer repos
  -> optional adapter leaf packages
  -> core contracts + coordinator + durable state
  -> Omnigent transport boundary
  -> Omnigent runtime
```

## Assumptions

- The working repository remains `ViperJuice/omniagent-plus`.
- The package/product target remains `agent-runtime-provider-omnigent`.
- TypeScript, Node 22+, ESM, pnpm, Vitest, and strict schemas are acceptable
  defaults unless later repo setup proves otherwise.
- Omnigent is not yet a trusted stable backend contract; Phase 1 must freeze
  the target version, API, CLI, event, error, and capability behavior.
- Live credentials, provider accounts, and real Omnigent processes are not
  required for roadmap planning.
- No implementation phase may depend on raw secrets, unbounded transcripts, or
  undocumented provider behavior.

## Non-Goals

- Do not build a real router before core contracts and durable state pass.
- Do not integrate real Omnigent transport before `docs/omnigent-contract.md`
  exists.
- Do not add UI before state, routing, and audit read models exist.
- Do not move governed-pipeline or agent-harness logic into this repo.
- Do not frame same-provider account switching as quota bypass.
- Do not persist API keys, OAuth tokens, bearer tokens, full env, or raw
  provider payloads.

## Cross-Cutting Principles

- Freeze contracts before live routing.
- Keep adapter dependency direction one-way and schema-based.
- Prefer durable state over in-memory state for any CLI, lease, cooldown, or
  scheduler behavior.
- Treat prior-agent output, logs, diffs, command output, and raw history as
  untrusted evidence.
- Make all fallback, cancellation, approval, and rate-limit decisions auditable.
- Use fake providers and fixtures before live provider calls.
- Fail closed when capability, auth isolation, lease ownership, or prompt trust
  cannot be proven.

## Top Interface-Freeze Gates

- IF-0-CONTRACT-1 - `docs/omnigent-contract.md` freezes the supported Omnigent
  version, HTTP/CLI/event/error contracts, capability matrix, cancel/close
  semantics, and fake-server fixtures.
- IF-0-BOOTCORE-2 - Repository bootstrap, package boundaries, core runtime
  schemas, state-machine tables, fake provider, and fake event stream are
  stable and test-covered.
- IF-0-STATELEDGER-3 - Durable local state, audit ledger, migrations,
  retention, redaction, and replay contracts are stable across processes.
- IF-0-TRANSPORT-4 - Omnigent HTTP/CLI/hybrid transport maps the frozen
  contract into provider events, sessions, history, failures, and capabilities.
- IF-0-LIMITS-5 - Rate-limit classifier fixtures and routing actions
  distinguish retryable limits, hard caps, auth/billing failures, policy
  blocks, outages, and unknown signals.
- IF-0-IDENTITY-6 - Identity profiles, env allowlists, secret refs, isolated
  homes, and Omnigent process isolation rules prevent auth bleed.
- IF-0-WORKTREE-7 - Worktree leasing uses durable atomic locks, fencing tokens,
  heartbeat renewal, stale recovery, and workspace-root placement rules.
- IF-0-HANDOFF-8 - Handoff packets and prompt renderers preserve trusted task
  instructions while fencing untrusted evidence.
- IF-0-COORDINATOR-9 - Coordinator routing persists decisions before launch,
  enforces cooldowns and active-turn limits, and replays route rationale from
  the ledger.
- IF-0-ADAPTERS-10 - Governed-pipeline and agent-harness adapters consume only
  public contracts and preserve native policy/result semantics.
- IF-0-CLI-11 - Operator CLI commands read/write durable state, return
  machine-readable JSON, and never expose secrets.
- IF-0-UI-12 - UI/control read models expose sessions, route decisions,
  approvals, cooldowns, and leases without Omnigent internals or secrets.
- IF-0-HARDEN-13 - End-to-end hardening proves crash recovery, retry-storm
  prevention, real Omnigent opt-in behavior, security posture, and release
  readiness.

## Phases

### Phase 1 — Omnigent Contract Freeze (CONTRACT)

**Objective**

Discover and freeze the exact Omnigent surface that the provider may rely on.

**Exit criteria**

- [ ] `docs/omnigent-contract.md` names the supported Omnigent version and git
  SHA or release tag.
- [ ] HTTP endpoints, request/response schemas, SSE event shapes, CLI commands,
  exit codes, and error payloads are documented.
- [ ] Capability negotiation marks every required feature as supported,
  emulated, unavailable, or blocked.
- [ ] Fake-server fixtures are captured from real or documented Omnigent
  behavior.
- [ ] Cancel, close, list, history, child-session, harness override, malformed
  event, reconnect, and terminal-event behavior are proven or explicitly
  unavailable.

**Scope notes**

- Decompose into 3 lanes:
  - Omnigent API/CLI discovery and capability matrix.
  - Event/error fixture capture and fake-server fixture shape.
  - Contract doc and downstream blocked/unavailable decisions.
- This phase can use read-only source/docs inspection and metadata-only command
  probes. It must not build the production transport.

**Non-goals**

- Do not implement real transport.
- Do not add scheduler or adapters.
- Do not require subscription/provider credentials.

**Key files**

- `specs/agent-runtime-provider-omnigent-spec.md`
- `docs/omnigent-contract.md`
- `fixtures/omnigent/`

**Depends on**

- (none)

**Produces**

- IF-0-CONTRACT-1 - `docs/omnigent-contract.md` freezes the supported Omnigent
  version, HTTP/CLI/event/error contracts, capability matrix, cancel/close
  semantics, and fake-server fixtures.

**Spec closeout policy**

```yaml
schema: spec_delta_closeout.v1
expected_decision: canonical_spec_update
target_surfaces:
  - docs/omnigent-contract.md
  - specs/agent-runtime-provider-omnigent-spec.md
evidence_paths:
  - docs/omnigent-contract.md
  - fixtures/omnigent/
redaction_posture: metadata_only
blocker_class: contract_bug
```

### Phase 2 — Bootstrap And Core Contracts (BOOTCORE)

**Objective**

Create the TypeScript monorepo and implement the runtime-neutral contracts with
a fake provider proving lifecycle and event semantics.

**Exit criteria**

- [ ] pnpm workspace, TypeScript strict config, Vitest, ESLint, package
  skeletons, README, and architecture docs exist.
- [ ] `core-contracts` exports schemas for `AgentRuntimeProvider`,
  `AgentSession`, `TurnHandle`, `RuntimeEventEnvelope`, `HandoffPacket`,
  `LimitClassification`, `RouteDecision`, `RuntimeFailure`,
  `IdentityProfile`, and `WorktreeLease`.
- [ ] Session and turn state-machine transition tables are documented and
  tested.
- [ ] Fake provider proves idempotency, one-active-turn policy, event replay,
  sequence gaps, heartbeats, and terminal events.
- [ ] No real Omnigent dependency exists in core packages.

**Scope notes**

- Decompose into 3 lanes:
  - Repo/package bootstrap and tooling.
  - Core schemas and state-machine tests.
  - Fake provider and fake event stream.
- This phase is contract-heavy and may proceed after CONTRACT produces enough
  fixture shape to avoid inventing backend behavior.
- Consume `IF-0-CONTRACT-1` as authoritative. BOOTCORE must model typed
  capability degradation instead of assuming every required Omnigent capability
  is natively available. In particular, the core contracts must tolerate a
  provider-emulated logical close, blocked child-session creation, blocked
  public harness override, and duplicate upstream terminal markers that require
  provider-side normalization.
- Do not derive the exhaustive upstream session-state enum from release
  `openapi.json` alone; the CONTRACT freeze records release drift where
  `waiting` is documented in `API.md` and `session.status` SSE but omitted from
  the `SessionResponse` enum.

**Non-goals**

- Do not implement real Omnigent transport.
- Do not persist durable state beyond test fixtures.
- Do not add downstream adapters.

**Key files**

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `vitest.config.ts`
- `packages/core-contracts/src/**`
- `fixtures/core/**`
- `docs/lifecycle-and-events.md`

**Depends on**

- CONTRACT

**Produces**

- IF-0-BOOTCORE-2 - Repository bootstrap, package boundaries, core runtime
  schemas, state-machine tables, fake provider, and fake event stream are
  stable and test-covered.

**Spec closeout policy**

```yaml
schema: spec_delta_closeout.v1
expected_decision: no_spec_delta
target_surfaces:
  - packages/core-contracts/
  - docs/lifecycle-and-events.md
evidence_paths:
  - test output from core schema/state-machine suites
redaction_posture: metadata_only
blocker_class: contract_bug
```

### Phase 3 — Durable State Ledger (STATELEDGER)

**Objective**

Make sessions, turns, events, routes, approvals, cooldowns, leases, and evidence
durable across processes.

**Exit criteria**

- [ ] Local state backend is implemented with SQLite or an approved append-only
  ledger plus indexes.
- [ ] Migrations, schema versions, retention rules, bounded payload checks, and
  redaction gates are tested.
- [ ] Sessions, turns, runtime events, route decisions, limit classifications,
  identity status, provider-family cooldowns, worktree leases, approvals,
  capability snapshots, and evidence refs persist.
- [ ] Two separate processes can read/write shared cooldown and lease state.
- [ ] Route replay works without live Omnigent.

**Scope notes**

- Decompose into 3 lanes:
  - State schema, migrations, and retention.
  - Audit ledger and replay APIs.
  - Redacted evidence store and cross-process tests.

**Non-goals**

- Do not build routing policy.
- Do not call real Omnigent.
- Do not add UI surfaces.

**Key files**

- `packages/state-ledger/src/**`
- `packages/core-contracts/src/state-ledger.ts`
- `docs/durable-state.md`
- `fixtures/state-ledger/**`

**Depends on**

- BOOTCORE

**Produces**

- IF-0-STATELEDGER-3 - Durable local state, audit ledger, migrations,
  retention, redaction, and replay contracts are stable across processes.

**Spec closeout policy**

```yaml
schema: spec_delta_closeout.v1
expected_decision: no_spec_delta
target_surfaces:
  - packages/state-ledger/
  - docs/durable-state.md
evidence_paths:
  - migration and cross-process state tests
redaction_posture: metadata_only
blocker_class: contract_bug
```

### Phase 4 — Omnigent Transport (TRANSPORT)

**Objective**

Implement documented Omnigent HTTP/CLI/hybrid transport and map backend
behavior into core runtime events, sessions, history, failures, and capability
snapshots.

**Exit criteria**

- [ ] Fake Omnigent conformance suite passes against Phase 1 fixtures.
- [ ] HTTP client uses only documented endpoints.
- [ ] CLI fallback uses only documented commands and exit-code contracts.
- [ ] Health/version/capability probe persists capability snapshots.
- [ ] Session creation, send-turn, history read, stream events, cancel, and
  close are implemented only where supported.
- [ ] Backend failures normalize to `RuntimeFailure` and
  `LimitClassification` candidates.
- [ ] CLI/hybrid process ownership and cleanup behavior is documented and
  tested.

**Scope notes**

- Decompose into 3 lanes:
  - Fake-server conformance and mapper tests.
  - HTTP/CLI clients and process manager.
  - Failure/capability mapping.

**Non-goals**

- Do not implement scheduler route selection.
- Do not solve identity profile isolation beyond transport hooks.
- Do not make live Omnigent mandatory in CI.

**Key files**

- `packages/omnigent-transport/src/**`
- `fixtures/omnigent/**`
- `docs/omnigent-contract.md`

**Depends on**

- CONTRACT
- BOOTCORE
- STATELEDGER

**Produces**

- IF-0-TRANSPORT-4 - Omnigent HTTP/CLI/hybrid transport maps the frozen
  contract into provider events, sessions, history, failures, and capabilities.

**Spec closeout policy**

```yaml
schema: spec_delta_closeout.v1
expected_decision: no_spec_delta
target_surfaces:
  - packages/omnigent-transport/
  - docs/omnigent-contract.md
evidence_paths:
  - fake Omnigent conformance tests
redaction_posture: metadata_only
blocker_class: contract_bug
```

### Phase 5 — Rate-Limit Catalog (LIMITS)

**Objective**

Classify provider and harness failure signals into typed routing inputs without
misclassifying auth, policy, outage, or non-limit failures.

**Exit criteria**

- [ ] Classifier engine, confidence scoring, unknown capture, and routing
  action mapper exist.
- [ ] Fixture corpus covers Claude Code, Codex, Gemini/Antigravity, OpenCode,
  Pi, OpenAI API, Anthropic API, Google/Gemini API, ZAI, MiniMax, and generic
  OpenAI-compatible APIs.
- [ ] Hard usage caps are not treated as burst limits.
- [ ] Non-limit 429s, auth failures, policy blocks, and outages are negative
  fixtures.
- [ ] Same-provider account switching uses `forbidden`,
  `manual_confirmation_required`, or `allowed_by_policy`.

**Scope notes**

- Decompose into 3 lanes:
  - Core classifier engine and normalized actions.
  - Provider/harness fixture corpus.
  - Negative fixtures and retry-storm guardrails.

**Non-goals**

- Do not implement global routing policy.
- Do not infer secret values from logs.

**Key files**

- `packages/rate-limit-catalog/src/**`
- `fixtures/rate-limits/**`
- `docs/rate-limit-taxonomy.md`

**Depends on**

- BOOTCORE

**Produces**

- IF-0-LIMITS-5 - Rate-limit classifier fixtures and routing actions
  distinguish retryable limits, hard caps, auth/billing failures, policy
  blocks, outages, and unknown signals.

**Spec closeout policy**

```yaml
schema: spec_delta_closeout.v1
expected_decision: no_spec_delta
target_surfaces:
  - packages/rate-limit-catalog/
  - docs/rate-limit-taxonomy.md
evidence_paths:
  - classifier fixture test output
redaction_posture: metadata_only
blocker_class: contract_bug
```

### Phase 6 — Identity Isolation (IDENTITY)

**Objective**

Implement identity profiles that isolate provider auth lanes and prevent
credential, env, home, and auth-volume bleed.

**Exit criteria**

- [ ] Profile loader supports isolated home, env allowlists, secret refs,
  process profile metadata, network policy, and tool policy refs.
- [ ] `host_env` is development-only and requires explicit env allowlist.
- [ ] Raw secret values are rejected from config, logs, events, handoffs, route
  decisions, and ledger records.
- [ ] Shared Omnigent HTTP mode is blocked unless contract evidence proves
  per-session identity isolation.
- [ ] Concurrent identity tests prove no env, home, or auth material crosses
  profiles.

**Scope notes**

- Decompose into 3 lanes:
  - Profile schema/config loader and preflight.
  - Env/secret redaction and leak tests.
  - Omnigent process-isolation decision enforcement.

**Non-goals**

- Do not create provider accounts.
- Do not automate billing or subscription management.
- Do not implement route selection.

**Key files**

- `packages/identity-isolation/src/**`
- `docs/identity-isolation.md`
- `docs/security-and-secrets.md`
- `fixtures/identity/**`

**Depends on**

- CONTRACT
- BOOTCORE
- STATELEDGER
- TRANSPORT

**Produces**

- IF-0-IDENTITY-6 - Identity profiles, env allowlists, secret refs, isolated
  homes, and Omnigent process isolation rules prevent auth bleed.

**Spec closeout policy**

```yaml
schema: spec_delta_closeout.v1
expected_decision: no_spec_delta
target_surfaces:
  - packages/identity-isolation/
  - docs/identity-isolation.md
  - docs/security-and-secrets.md
evidence_paths:
  - identity isolation and secret-leak tests
redaction_posture: metadata_only
blocker_class: contract_bug
```

### Phase 7 — Worktree Leasing (WORKTREE)

**Objective**

Provide durable worktree leases for sequential continuation and parallel lane
isolation.

**Exit criteria**

- [ ] Atomic cross-process lock acquisition is implemented.
- [ ] Exclusive leases include fencing tokens, holder identity, heartbeat
  renewal, TTL, and dirty-state tracking.
- [ ] Stale recovery checks process liveness, host identity, branch state, and
  dirty state.
- [ ] Cleanup verifies fencing token and refuses dirty worktree deletion.
- [ ] Worktree creation honors `/mnt/workspace/worktrees/<project>-<branch>`
  when `/mnt/workspace` exists.
- [ ] Two separate processes cannot acquire the same exclusive lease.

**Scope notes**

- Decompose into 3 lanes:
  - Durable lock and fencing-token implementation.
  - Git/worktree placement and branch collision policy.
  - Cleanup, stale recovery, and race tests.

**Non-goals**

- Do not implement handoff packet rendering.
- Do not add consumer adapters.

**Key files**

- `packages/worktree-leasing/src/**`
- `docs/worktree-leasing.md`
- `fixtures/worktree/**`

**Depends on**

- BOOTCORE
- STATELEDGER

**Produces**

- IF-0-WORKTREE-7 - Worktree leasing uses durable atomic locks, fencing tokens,
  heartbeat renewal, stale recovery, and workspace-root placement rules.

**Spec closeout policy**

```yaml
schema: spec_delta_closeout.v1
expected_decision: no_spec_delta
target_surfaces:
  - packages/worktree-leasing/
  - docs/worktree-leasing.md
evidence_paths:
  - worktree race and stale recovery tests
redaction_posture: metadata_only
blocker_class: contract_bug
```

### Phase 8 — Handoff Packet Builder (HANDOFF)

**Objective**

Build typed handoff packets and renderers that preserve task continuity without
turning untrusted evidence into instructions.

**Exit criteria**

- [ ] Packet builder validates typed task contract, workspace state, evidence,
  decisions, assumptions, risks, and context policy.
- [ ] Renderer separates trusted objective/task contract from untrusted logs,
  diffs, command output, prior-agent summaries, and raw history excerpts.
- [ ] Prompt-injection fixtures prove malicious evidence cannot become
  system/developer/operator instructions.
- [ ] Worktree, diff, command, and test evidence refs are bounded and redacted.
- [ ] Raw history remains optional and bounded.

**Scope notes**

- Decompose into 3 lanes:
  - Handoff schema/builder and evidence collectors.
  - Target-harness renderers.
  - Prompt-injection and redaction fixtures.

**Non-goals**

- Do not summarize unlimited transcripts.
- Do not implement routing policy.

**Key files**

- `packages/core-contracts/src/handoff-packet.ts`
- `packages/core-contracts/src/redaction.ts`
- `docs/handoff-packets.md`
- `fixtures/handoff/**`

**Depends on**

- BOOTCORE
- STATELEDGER
- WORKTREE

**Produces**

- IF-0-HANDOFF-8 - Handoff packets and prompt renderers preserve trusted task
  instructions while fencing untrusted evidence.

**Spec closeout policy**

```yaml
schema: spec_delta_closeout.v1
expected_decision: no_spec_delta
target_surfaces:
  - packages/core-contracts/src/handoff-packet.ts
  - docs/handoff-packets.md
evidence_paths:
  - prompt-injection and handoff fixture tests
redaction_posture: metadata_only
blocker_class: contract_bug
```

### Phase 9 — Coordinator And Router (COORDINATOR)

**Objective**

Implement provider-aware routing, cooldowns, active-turn accounting,
portability scoring, and launch gating on top of durable state.

**Exit criteria**

- [ ] Route decisions are persisted before backend launch.
- [ ] Burst limits reduce active-turn target.
- [ ] Fixed usage caps pause identity/provider family until reset.
- [ ] Provider-family cooldown prevents immediate same-provider account hopping
  unless policy requires manual confirmation.
- [ ] Portable work can route across provider families.
- [ ] Low-portability sessions wait/retry same provider by default.
- [ ] Ledger replay explains selected provider, harness, identity, fallback
  reason, and evidence refs.

**Scope notes**

- Decompose into 3 lanes:
  - Identity pool, cooldowns, active-turn counters, and adaptive concurrency.
  - Task portability and route decision persistence.
  - Failure/retry storm guardrails.

**Non-goals**

- Do not add consumer adapters.
- Do not add UI.
- Do not silently downgrade executor labels.

**Key files**

- `packages/coordinator/src/**`
- `packages/core-contracts/src/route-decision.ts`
- `docs/architecture.md`

**Depends on**

- STATELEDGER
- TRANSPORT
- LIMITS
- IDENTITY
- WORKTREE
- HANDOFF

**Produces**

- IF-0-COORDINATOR-9 - Coordinator routing persists decisions before launch,
  enforces cooldowns and active-turn limits, and replays route rationale from
  the ledger.

**Spec closeout policy**

```yaml
schema: spec_delta_closeout.v1
expected_decision: no_spec_delta
target_surfaces:
  - packages/coordinator/
  - docs/architecture.md
evidence_paths:
  - coordinator routing and retry guardrail tests
redaction_posture: metadata_only
blocker_class: contract_bug
```

### Phase 10 — Consumer Adapter Contracts (ADAPTERS)

**Objective**

Add optional governed-pipeline and agent-harness adapters without importing
consumer internals.

**Exit criteria**

- [ ] Governed-pipeline public contract fixtures exist for
  `invokeAgenticHarness` and `executor_adapter_result.v0.1`.
- [ ] Agent-harness public contract fixtures exist for phase-loop launch
  request/result metadata.
- [ ] Adapter packages import provider contracts and public fixtures only.
- [ ] Governed-pipeline adapter preserves `silent_downgrade = false`, fallback
  reason, typed blockers, and bounded redacted log excerpts.
- [ ] Agent-harness adapter preserves model policy, effort, run mode, dry run,
  and unavailable reason semantics.

**Scope notes**

- Decompose into 3 lanes:
  - Governed-pipeline adapter mapper and fixtures.
  - Agent-harness adapter mapper and fixtures.
  - Dependency-direction enforcement tests.

**Non-goals**

- Do not modify consumer repos from this phase.
- Do not import private consumer modules.
- Do not require live Omnigent.

**Key files**

- `packages/governed-pipeline-adapter/src/**`
- `packages/agent-harness-adapter/src/**`
- `examples/governed-pipeline/**`
- `examples/agent-harness/**`
- `docs/governed-pipeline-integration.md`
- `docs/agent-harness-integration.md`

**Depends on**

- COORDINATOR

**Produces**

- IF-0-ADAPTERS-10 - Governed-pipeline and agent-harness adapters consume only
  public contracts and preserve native policy/result semantics.

**Spec closeout policy**

```yaml
schema: spec_delta_closeout.v1
expected_decision: no_spec_delta
target_surfaces:
  - packages/governed-pipeline-adapter/
  - packages/agent-harness-adapter/
  - docs/governed-pipeline-integration.md
  - docs/agent-harness-integration.md
evidence_paths:
  - adapter fixture and dependency-direction tests
redaction_posture: metadata_only
blocker_class: contract_bug
```

### Phase 11 — Operator CLI (CLI)

**Objective**

Provide local operator commands backed by durable state and redacted JSON
output.

**Exit criteria**

- [ ] `health`, `sessions list/show`, `route-task`, `classify-limit`,
  `identities list/preflight`, and `worktrees list/cleanup` commands exist.
- [ ] `--json` output is stable and schema-backed.
- [ ] Human output is readable and redacted.
- [ ] Nonzero exit codes map to meaningful typed failure categories.
- [ ] Repeated CLI invocations share state through the durable backend.

**Scope notes**

- Decompose into 3 lanes:
  - CLI command framework and JSON output contracts.
  - State-backed session/identity/worktree commands.
  - Classification/route dry-run commands and exit-code tests.

**Non-goals**

- Do not build UI.
- Do not add hidden credential lookup.

**Key files**

- `packages/cli/src/**`
- `docs/architecture.md`
- `README.md`

**Depends on**

- STATELEDGER
- LIMITS
- IDENTITY
- WORKTREE
- COORDINATOR

**Produces**

- IF-0-CLI-11 - Operator CLI commands read/write durable state, return
  machine-readable JSON, and never expose secrets.

**Spec closeout policy**

```yaml
schema: spec_delta_closeout.v1
expected_decision: no_spec_delta
target_surfaces:
  - packages/cli/
  - README.md
evidence_paths:
  - CLI JSON and exit-code tests
redaction_posture: metadata_only
blocker_class: contract_bug
```

### Phase 12 — UI Read Model (UI)

**Objective**

Prepare the API/read model for a future local UI or control surface without
letting UI code depend on Omnigent internals.

**Exit criteria**

- [ ] Read models expose provider lane status, session tree, active turns,
  cooldowns, worktree leases, handoff packets, approval requests, route
  decisions, and limit classifications.
- [ ] Read models are backed by durable state and evidence refs.
- [ ] UI-facing payloads redact secrets and bounded evidence excerpts.
- [ ] Approval and cooldown states are inspectable and auditable.
- [ ] No UI-facing API imports Omnigent internals.

**Scope notes**

- Decompose into 3 lanes:
  - API-ready read model schemas.
  - Redacted projection tests.
  - Minimal local UI or documented API-ready surface.

**Non-goals**

- Do not build a marketing page.
- Do not add account mutation UI.
- Do not expose raw transcripts or provider payloads.

**Key files**

- `packages/core-contracts/src/**`
- `packages/state-ledger/src/replay.ts`
- `docs/architecture.md`

**Depends on**

- STATELEDGER
- COORDINATOR
- CLI

**Produces**

- IF-0-UI-12 - UI/control read models expose sessions, route decisions,
  approvals, cooldowns, and leases without Omnigent internals or secrets.

**Spec closeout policy**

```yaml
schema: spec_delta_closeout.v1
expected_decision: no_spec_delta
target_surfaces:
  - docs/architecture.md
  - packages/core-contracts/
  - packages/state-ledger/
evidence_paths:
  - read-model redaction and projection tests
redaction_posture: metadata_only
blocker_class: contract_bug
```

### Phase 13 — Hardening And Readiness (HARDEN)

**Objective**

Prove reliability, security, crash recovery, optional live Omnigent behavior,
and release readiness before any production or commercialization claim.

**Exit criteria**

- [ ] Full test suite passes.
- [ ] Optional live Omnigent tests are documented and gated by env vars.
- [ ] Orchestrator crash does not leave unmanaged backend loops indefinitely.
- [ ] Retry storms stop at configured max attempts with jitter/cooldown.
- [ ] Worktree locks recover from crashed processes.
- [ ] Security review covers secrets, identity isolation, prompt injection,
  tool approvals, data retention, provider terms, and subscription/account use.
- [ ] Release/readiness docs do not overclaim alpha, public-beta, production,
  or commercialization readiness.

**Scope notes**

- Decompose into 3 lanes:
  - Chaos/crash/retry/worktree recovery tests.
  - Optional live Omnigent and provider-smoke documentation.
  - Security, licensing, and commercialization readiness docs.

**Non-goals**

- Do not require live credentials in default CI.
- Do not claim multi-user SaaS readiness.

**Key files**

- `docs/security-and-secrets.md`
- `docs/commercialization-checklist.md`
- `README.md`
- `packages/**`
- `fixtures/**`

**Depends on**

- ADAPTERS
- CLI
- UI

**Produces**

- IF-0-HARDEN-13 - End-to-end hardening proves crash recovery, retry-storm
  prevention, real Omnigent opt-in behavior, security posture, and release
  readiness.

**Spec closeout policy**

```yaml
schema: spec_delta_closeout.v1
expected_decision: no_spec_delta
target_surfaces:
  - docs/security-and-secrets.md
  - docs/commercialization-checklist.md
  - README.md
evidence_paths:
  - full suite, chaos, redaction, and optional live-test evidence
redaction_posture: metadata_only
blocker_class: contract_bug
```

## Phase Dependency DAG

```text
CONTRACT -> BOOTCORE -> STATELEDGER -> TRANSPORT -> IDENTITY
                     \              \              \
                      \              -> WORKTREE -> HANDOFF
                       -> LIMITS --------------------\
                                                       -> COORDINATOR -> ADAPTERS -> HARDEN
STATELEDGER -> WORKTREE ------------------------------/
STATELEDGER -> CLI -> UI -----------------------------/
COORDINATOR -> CLI -----------------------------------/
COORDINATOR -> UI ------------------------------------/
```

Expanded dependency list:

```text
CONTRACT: (none)
BOOTCORE: CONTRACT
STATELEDGER: BOOTCORE
TRANSPORT: CONTRACT, BOOTCORE, STATELEDGER
LIMITS: BOOTCORE
IDENTITY: CONTRACT, BOOTCORE, STATELEDGER, TRANSPORT
WORKTREE: BOOTCORE, STATELEDGER
HANDOFF: BOOTCORE, STATELEDGER, WORKTREE
COORDINATOR: STATELEDGER, TRANSPORT, LIMITS, IDENTITY, WORKTREE, HANDOFF
ADAPTERS: COORDINATOR
CLI: STATELEDGER, LIMITS, IDENTITY, WORKTREE, COORDINATOR
UI: STATELEDGER, COORDINATOR, CLI
HARDEN: ADAPTERS, CLI, UI
```

## Execution Notes

- CONTRACT is the only phase that should be planned first.
- BOOTCORE can start after CONTRACT freezes enough fixture shape to define fake
  transport semantics.
- LIMITS can run after BOOTCORE and does not need real Omnigent transport.
- STATELEDGER should complete before any feature that claims durable routing,
  lease, identity, approval, or CLI behavior.
- WORKTREE and LIMITS can be planned in parallel after their gates are ready.
- IDENTITY waits for TRANSPORT because shared Omnigent HTTP isolation depends on
  the transport contract.
- HANDOFF waits for WORKTREE so packets can cite real lease/diff metadata.
- COORDINATOR waits for all state, transport, limit, identity, worktree, and
  handoff gates.
- ADAPTERS, CLI, and UI are downstream surfaces; they should not be planned as
  implementation phases until COORDINATOR exists, except for harmless docs or
  fixture preparation called out by a later roadmap amendment.
- HARDEN is the final evidence reducer and should not introduce new product
  behavior.

## Verification

Run these after implementation phases, not during roadmap planning:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm test
pnpm lint
pnpm typecheck
git diff --check
phase-loop validate-roadmap specs/phase-plans-v1.md
```

Phase-specific verification commands should be added by downstream
`codex-plan-phase` artifacts. They must include an effective
`automation.suite_command`.

Optional live tests must be opt-in and must not run in default CI:

```bash
RUN_LIVE_OMNIGENT=1 pnpm test -- --runInBand
RUN_LIVE_CLAUDE=1 pnpm test -- --runInBand
RUN_LIVE_CODEX=1 pnpm test -- --runInBand
RUN_LIVE_GEMINI=1 pnpm test -- --runInBand
```

## Automation Handoff

```yaml
automation:
  status: unplanned
  next_skill: codex-plan-phase
  next_command: codex-plan-phase specs/phase-plans-v1.md CONTRACT
  next_model_hint: plan
  next_effort_hint: high
  human_required: false
  blocker_class: none
  blocker_summary: none
  required_human_inputs: []
  verification_status: not_run
  artifact: /home/viperjuice/code/omniagent-plus/specs/phase-plans-v1.md
  artifact_state: staged
```
