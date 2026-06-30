# Advisor Panel Feedback - 2026-06-30

Reviewed artifact: `specs/agent-runtime-provider-omnigent-spec.md`

Usable reviewers:
- Codex GPT-5.5 via `codex exec`, max effort.
- Gemini 3.1 Pro High via `agy`, max effort.
- Laplace GPT-5.5 sub-agent, xhigh effort.

Claude Agent View was attempted twice but blocked before producing a collectable review. Those sessions were stopped and are not counted as usable review output.

## Consensus Verdict

All usable reviewers returned `PARTIALLY AGREE`.

The spec has the right strategic shape: a separate TypeScript provider around Omnigent, preserving governed-pipeline and agent-harness boundaries, with explicit routing, handoff, and worktree concepts. It is not yet implementation-ready. The hard correctness contracts are still underspecified: Omnigent compatibility, session and turn lifecycle, stream semantics, durable state, identity isolation, worktree locking, cancellation, tool approvals, error taxonomy, adapter boundaries, and acceptance gates.

## Highest-Priority Fixes

1. Freeze the Omnigent contract before implementing the provider.
   - Define supported Omnigent versions.
   - Capture exact HTTP endpoints, SSE/event shapes, CLI commands, request and response schemas, cancel behavior, close behavior, child-session support, and failure payloads.
   - Add capability negotiation and degradation rules for missing Omnigent features.
   - Build fake-server fixtures from real Omnigent responses.

2. Add explicit session, turn, and event state machines.
   - Define `sessionId`, `turnId`, `idempotencyKey`, `correlationId`, parent/root session ids, timestamps, active-turn policy, terminal states, timeout behavior, retry ownership, cancellation states, and resume semantics.
   - Define one authoritative event envelope with `schema`, `eventId`, `sessionId`, `turnId`, monotonic `sequence`, timestamp, payload, redaction status, terminal flag, replay cursor, heartbeat, reconnect, dedupe, and ordering guarantees.

3. Add a durable local state model.
   - Do not rely on in-memory provider state if CLI invocations and multiple Node processes can operate concurrently.
   - Specify SQLite or an append-only ledger plus indexes for sessions, turns, route decisions, limit classifications, identity switches, worktree leases, audit evidence refs, schema versions, migrations, retention, and redaction.

4. Resolve identity isolation versus shared Omnigent server mode.
   - A single shared Python server cannot safely hot-swap `$HOME`, `process.env`, auth volumes, or per-profile credentials unless Omnigent natively enforces that isolation.
   - Either require one Omnigent backend process per active identity profile, or prove and document strict per-session isolation in Omnigent HTTP mode.
   - Replace raw env maps with named secret/profile references and explicit env allowlists.

5. Harden security and prompt-injection boundaries.
   - Add a threat model covering auth bleed, host env leakage, untrusted handoff content, transcript/log injection, filesystem boundary escape, tool approval abuse, and cross-tenant assumptions.
   - Define a rendering contract that separates operator instructions, task contract, trusted evidence metadata, and untrusted transcript/log/diff excerpts.
   - Prohibit untrusted prior-agent output from becoming system/developer instructions.

6. Redesign worktree leasing as a durable lock protocol.
   - Define lock backend, atomic acquisition, fencing tokens, host and PID identity, heartbeat renewal, TTL, stale-lock recovery, dirty-tree policy, branch collision policy, allowed worktree roots, cleanup safety, and symlink/path traversal rejection.
   - Include the `/mnt/workspace/worktrees/<project>-<branch>` rule for workspace-enabled hosts.

7. Define tool-use and approval control flow.
   - Specify tool call/result envelopes, approval request ids, approval response ids, allowed approvers, deny behavior, timeout behavior, cancellation interaction, audit records, and mapping from native harness tool events into the neutral runtime protocol.

8. Complete the error taxonomy.
   - Define normalized `RuntimeFailure` categories: validation, transport, protocol, auth, billing, rate-limit, policy-denied, timeout, cancelled, harness-unavailable, backend-version-mismatch, sandbox-denied, approval-required, malformed-response, and internal.
   - Include recoverability, source actor, scope, retry-after, safe diagnostics, redacted evidence, and cause chain.

9. Narrow package boundaries and adapter dependency direction.
   - Split responsibilities into hard packages such as `core-contracts`, `omnigent-transport`, `coordinator`, `identity-isolation`, `worktree-leasing`, and optional adapters.
   - State which packages are pure/schema-only, which may persist state, which may spawn processes, and which may touch git.
   - Forbid adapters from importing governed-pipeline or agent-harness internals. Use public schemas, peer dependencies, or consumer-owned adapter packages.

10. Normalize names and public enums.
    - Add a glossary and canonical enum table for `HarnessId`, `ProviderFamilyId`, `BackendId`, `RuntimeId`, `SessionId`, and adapter-local names.
    - Resolve `claude-code` versus `claude`, `gemini` versus `gemini-antigravity`, `executor` versus `harness`, and whether the core is Omnigent-specific or runtime-neutral.

## Required Acceptance Gates

- Omnigent conformance suite against pinned real and fake responses.
- Multi-process durable state test where separate CLI/provider processes share cooldowns and leases.
- Concurrent identity isolation test proving no auth, `$HOME`, env, or credential bleed.
- Turn lifecycle tests for duplicate idempotency key, concurrent send, queue/reject policy, timeout, cancel during stream, close during active turn, and resume.
- Event stream tests for sequence ordering, reconnect, replay cursor, dedupe, malformed event, backpressure, heartbeat, and terminal event handling.
- Crash recovery test that kills the Node orchestrator mid-turn and verifies process cleanup plus lease recovery.
- Worktree race tests for simultaneous exclusive acquisition, stale lease cleanup, dirty worktrees, branch collisions, and cleanup safety.
- Prompt-injection fixtures for malicious transcript, log, diff, and prior-agent output inside handoff packets.
- Secret-leak tests across config, logs, events, handoff packets, CLI JSON, route decisions, and audit ledger.
- Tool approval tests for allow, deny, timeout, cancellation, and audit persistence.
- Adapter contract tests against governed-pipeline and agent-harness public schemas without importing internals.
- Retry-storm prevention tests with max attempts, jitter, cooldown, and misclassified limit failures.

## Blocking Questions

- Is this repo an Omnigent-specific provider or a general runtime router with Omnigent as the first backend?
- What exact Omnigent version and API surface is the initial target?
- Is HTTP/server mode mandatory for v0, or can CLI mode ship first?
- Where does authoritative session state live: Omnigent, the provider ledger, or consumers?
- Are multiple active turns allowed in one session?
- Who owns identity profile creation and secret resolution: the provider, operator config, 1Password, environment, or Omnigent?
- What isolation level is required for local subscription CLIs: isolated home, process env, container, Unix user, or VM?
- What fields in handoff packets are trusted operator intent versus untrusted evidence?
- How are approval requests surfaced, persisted, and resumed?
- What are rollback semantics if a routed agent edits a worktree and then fails?

## Recommended Rewrite Order

1. Add glossary and canonical enum table.
2. Add Omnigent contract discovery/freeze phase as phase zero.
3. Add session, turn, event, cancellation, and error schemas.
4. Add durable state and audit ledger section.
5. Add identity isolation and threat model section.
6. Replace worktree lease sketch with durable lock protocol.
7. Define tool approval protocol.
8. Tighten package boundaries and adapter dependency rules.
9. Revise milestone sequencing so v0.1 is contracts plus fake Omnigent, not full scheduler/UI/routing.
10. Add acceptance gates as mandatory phase exits.
