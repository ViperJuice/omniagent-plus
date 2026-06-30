---
phase_loop_plan_version: 1
phase: CONTRACT
roadmap: specs/phase-plans-v1.md
roadmap_sha256: 4f00856b97eedf946b13c5469633c824abcf8676debe4388706cc288cbe6d86c
---

# CONTRACT: Omnigent Contract Freeze

## Context

`CONTRACT` is Phase 1 from `specs/phase-plans-v1.md`. The phase freezes the Omnigent surface that `agent-runtime-provider-omnigent` may rely on before any TypeScript transport, scheduler, durable state, identity, worktree, adapter, CLI, or UI phase starts.

The repository is currently spec-only. The active source spec is `specs/agent-runtime-provider-omnigent-spec.md`, and the roadmap identifies `docs/omnigent-contract.md` plus `fixtures/omnigent/` as the phase-owned contract outputs. The plan treats Omnigent as an external backend and requires documented or observed provenance for every capability, event, error, and lifecycle claim.

## Interface Freeze Gates

- [ ] IF-0-CONTRACT-1 - `docs/omnigent-contract.md` freezes the supported Omnigent version and source ref, HTTP endpoint/request/response surface, CLI command/exit-code surface, SSE/runtime event shapes, error payload taxonomy, capability matrix, cancel/close/list/history/child-session/harness-override/reconnect/terminal-event semantics, and the fake-server fixtures under `fixtures/omnigent/`.
  - Required document anchors: `Supported Version`, `Source Provenance`, `HTTP API Surface`, `CLI Surface`, `Event Stream`, `Error Taxonomy`, `Capability Matrix`, `Lifecycle Semantics`, `Fixture Index`, and `Downstream Decisions`.
  - Required capability rows: `create_session`, `send_turn`, `stream_events`, `read_history`, `cancel_turn`, `close_session`, `list_sessions`, `child_session`, `harness_override`, `malformed_event`, `reconnect`, and `terminal_event_uniqueness`, each marked `supported`, `emulated`, `unavailable`, or `blocked` with provenance.
  - Required fixture families: `fixtures/omnigent/discovery/*.json`, `fixtures/omnigent/events/*.json`, `fixtures/omnigent/errors/*.json`, and `fixtures/omnigent/fake-server/scenarios.json`, all metadata-only and redacted.

## Spec Closeout Plan

- schema: `spec_delta_closeout.v1`
- decision: `canonical_spec_update`
- target surfaces: `docs/omnigent-contract.md`, `specs/agent-runtime-provider-omnigent-spec.md`
- evidence paths: `docs/omnigent-contract.md`, `fixtures/omnigent/`
- redaction posture: `metadata_only`
- downstream handling: downstream phases may consume IF-0-CONTRACT-1 only after the closeout records the produced gate and the verification suite passes.

## Lane Index & Dependencies

SL-0 — Omnigent source and CLI surface discovery
  Depends on: (none)
  Blocks: SL-1, SL-2, SL-3
  Parallel-safe: no

SL-1 — Event, error, and fake-server fixture shape
  Depends on: SL-0
  Blocks: SL-2, SL-3
  Parallel-safe: yes

SL-2 — Contract document and spec delta reducer
  Depends on: SL-0, SL-1
  Blocks: SL-3
  Parallel-safe: no

SL-3 — Verification and docs sweep
  Depends on: SL-0, SL-1, SL-2
  Blocks: (none)
  Parallel-safe: no

## Execution Policy

- work-unit defaults: work-unit=`lane_execute`, effort=`high`, unsupported=`inherit_default`, inherit-default=`true`
- SL-2: executor=`codex`, model=`gpt-5.5`, effort=`high`, work-unit=`phase_reducer`, reason=`contract synthesis and canonical spec closeout`
- SL-3: executor=`codex`, model=`gpt-5.5`, effort=`medium`, work-unit=`phase_verify`, reason=`phase verification`

## Lanes

### SL-0 — Omnigent source and CLI surface discovery

- **Scope**: Identify the authoritative Omnigent version/source and capture metadata-only HTTP and CLI surface observations without requiring provider credentials.
- **Owned files**: `fixtures/omnigent/discovery/source-metadata.json`, `fixtures/omnigent/discovery/cli-surface.json`, `fixtures/omnigent/discovery/http-surface.json`, `fixtures/omnigent/discovery/capability-probes.json`
- **Interfaces provided**: `omnigent.source_metadata.v1`, `omnigent.cli_surface.v1`, `omnigent.http_surface.v1`, `omnigent.capability_probe_matrix.v1`
- **Interfaces consumed**: `specs/phase-plans-v1.md` (pre-existing), `specs/agent-runtime-provider-omnigent-spec.md` (pre-existing)
- **Parallel-safe**: no

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-0-T1 | test | (none) | `fixtures/omnigent/discovery/*.json` | metadata schema checks | `test ! -e fixtures/omnigent/discovery/source-metadata.json || python3 -m json.tool fixtures/omnigent/discovery/source-metadata.json >/dev/null` |
| SL-0-T2 | impl | SL-0-T1 | `fixtures/omnigent/discovery/source-metadata.json`, `fixtures/omnigent/discovery/cli-surface.json`, `fixtures/omnigent/discovery/http-surface.json`, `fixtures/omnigent/discovery/capability-probes.json` | n/a | n/a |
| SL-0-T3 | verify | SL-0-T2 | `fixtures/omnigent/discovery/*.json` | metadata schema checks | `python3 -m json.tool fixtures/omnigent/discovery/source-metadata.json >/dev/null && python3 -m json.tool fixtures/omnigent/discovery/cli-surface.json >/dev/null && python3 -m json.tool fixtures/omnigent/discovery/http-surface.json >/dev/null && python3 -m json.tool fixtures/omnigent/discovery/capability-probes.json >/dev/null` |

### SL-1 — Event, error, and fake-server fixture shape

- **Scope**: Convert documented or observed Omnigent behavior into bounded event/error fixtures and fake-server scenario definitions.
- **Owned files**: `fixtures/omnigent/events/*.json`, `fixtures/omnigent/errors/*.json`, `fixtures/omnigent/fake-server/scenarios.json`, `fixtures/omnigent/fake-server/README.md`
- **Interfaces provided**: `omnigent.event_fixture_catalog.v1`, `omnigent.error_fixture_catalog.v1`, `omnigent.fake_server_scenarios.v1`
- **Interfaces consumed**: `omnigent.source_metadata.v1`, `omnigent.cli_surface.v1`, `omnigent.http_surface.v1`, `omnigent.capability_probe_matrix.v1`
- **Parallel-safe**: yes

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-1-T1 | test | SL-0-T3 | `fixtures/omnigent/events/*.json`, `fixtures/omnigent/errors/*.json`, `fixtures/omnigent/fake-server/scenarios.json` | fixture parse checks | `find fixtures/omnigent -path '*/events/*.json' -o -path '*/errors/*.json' -o -path '*/fake-server/scenarios.json' | sort | xargs -r -n1 python3 -m json.tool >/dev/null` |
| SL-1-T2 | impl | SL-1-T1 | `fixtures/omnigent/events/*.json`, `fixtures/omnigent/errors/*.json`, `fixtures/omnigent/fake-server/scenarios.json`, `fixtures/omnigent/fake-server/README.md` | n/a | n/a |
| SL-1-T3 | verify | SL-1-T2 | `fixtures/omnigent/events/*.json`, `fixtures/omnigent/errors/*.json`, `fixtures/omnigent/fake-server/scenarios.json`, `fixtures/omnigent/fake-server/README.md` | fixture parse checks | `find fixtures/omnigent -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null && rg -n "schema|provenance|redaction|scenario" fixtures/omnigent/fake-server/README.md` |

### SL-2 — Contract document and spec delta reducer

- **Scope**: Synthesize the discovery and fixture evidence into the frozen contract doc and update the canonical spec only where the evidence changes downstream assumptions.
- **Owned files**: `docs/omnigent-contract.md`, `specs/agent-runtime-provider-omnigent-spec.md`
- **Interfaces provided**: `IF-0-CONTRACT-1`, `spec_delta_closeout.v1:canonical_spec_update`
- **Interfaces consumed**: `omnigent.source_metadata.v1`, `omnigent.cli_surface.v1`, `omnigent.http_surface.v1`, `omnigent.capability_probe_matrix.v1`, `omnigent.event_fixture_catalog.v1`, `omnigent.error_fixture_catalog.v1`, `omnigent.fake_server_scenarios.v1`
- **Parallel-safe**: no

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-2-T1 | test | SL-1-T3 | `docs/omnigent-contract.md`, `specs/agent-runtime-provider-omnigent-spec.md` | contract anchor checks | `test ! -e docs/omnigent-contract.md || rg -n "Supported Version|Capability Matrix|Lifecycle Semantics" docs/omnigent-contract.md` |
| SL-2-T2 | impl | SL-2-T1 | `docs/omnigent-contract.md`, `specs/agent-runtime-provider-omnigent-spec.md` | n/a | n/a |
| SL-2-T3 | verify | SL-2-T2 | `docs/omnigent-contract.md`, `specs/agent-runtime-provider-omnigent-spec.md` | contract anchor checks | `rg -n "Supported Version|Source Provenance|HTTP API Surface|CLI Surface|Event Stream|Error Taxonomy|Capability Matrix|Lifecycle Semantics|Fixture Index|Downstream Decisions" docs/omnigent-contract.md && rg -n "IF-0-CONTRACT-1|docs/omnigent-contract.md" specs/agent-runtime-provider-omnigent-spec.md` |

### SL-3 — Verification and docs sweep

- **Scope**: Verify the complete contract package, confirm docs impact is handled, and produce the runner-facing evidence for IF-0-CONTRACT-1.
- **Owned files**: none
- **Interfaces provided**: `automation.suite_command:contract-plan-verify`
- **Interfaces consumed**: `IF-0-CONTRACT-1`, `spec_delta_closeout.v1:canonical_spec_update`
- **Parallel-safe**: no

| Task ID | Type | Depends on | Files in scope | Tests owned | Test command |
| --- | --- | --- | --- | --- | --- |
| SL-3-T1 | test | SL-2-T3 | `docs/omnigent-contract.md`, `fixtures/omnigent/`, `specs/agent-runtime-provider-omnigent-spec.md` | phase verification suite | `git diff --check -- docs/omnigent-contract.md specs/agent-runtime-provider-omnigent-spec.md fixtures/omnigent` |
| SL-3-T2 | impl | SL-3-T1 | `docs/omnigent-contract.md`, `fixtures/omnigent/`, `specs/agent-runtime-provider-omnigent-spec.md` | n/a | n/a |
| SL-3-T3 | verify | SL-3-T2 | `docs/omnigent-contract.md`, `fixtures/omnigent/`, `specs/agent-runtime-provider-omnigent-spec.md` | phase verification suite | `git diff --check -- docs/omnigent-contract.md specs/agent-runtime-provider-omnigent-spec.md fixtures/omnigent && find fixtures/omnigent -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null && rg -n "supported|emulated|unavailable|blocked" docs/omnigent-contract.md` |

## Execution Notes

- Treat `.phase-loop/` as the authoritative runner state. Legacy `.codex/phase-loop/` files are compatibility artifacts only and must not block or supersede canonical `.phase-loop/` state.
- If execution creates worktrees and `/mnt/workspace` exists, place them under `/mnt/workspace/worktrees/omniagent-plus-<branch>`.
- Use read-only source/docs inspection and metadata-only command probes such as `command -v omnigent`, `omnigent --version`, `omnigent --help`, or source-tree help extraction. Do not require provider credentials, live subscriptions, account setup, or secret-bearing environment dumps.
- If no authoritative Omnigent version/source ref can be identified, stop with a repairable blocker instead of inventing a contract. If individual capabilities cannot be proven, mark those capabilities `unavailable` or `blocked` with provenance and continue only when downstream behavior remains explicit.
- Preserve unrelated edits in `specs/agent-runtime-provider-omnigent-spec.md`; read the current file before changing it because this repo may already contain pre-existing spec edits.
- JSON fixtures must contain metadata-only payloads, provenance, redaction posture, and bounded examples. Do not persist API keys, OAuth tokens, bearer tokens, full env, raw provider payloads, or unbounded transcripts.
- `SL-3` is the no-op docs sweep unless it finds a missing contract/doc impact; any fix it identifies belongs back in `SL-2` because `SL-3` owns no files.
- `SL-3` records `no_doc_delta` for README, CHANGELOG, and release-notes surfaces unless execution discovers that the contract phase changed those public docs.

## Acceptance Criteria

- [ ] `docs/omnigent-contract.md` names the supported Omnigent version plus git SHA or release tag and cites the source of that provenance.
- [ ] `docs/omnigent-contract.md` contains the required anchors `Supported Version`, `Source Provenance`, `HTTP API Surface`, `CLI Surface`, `Event Stream`, `Error Taxonomy`, `Capability Matrix`, `Lifecycle Semantics`, `Fixture Index`, and `Downstream Decisions`.
- [ ] `fixtures/omnigent/discovery/source-metadata.json`, `fixtures/omnigent/discovery/cli-surface.json`, `fixtures/omnigent/discovery/http-surface.json`, and `fixtures/omnigent/discovery/capability-probes.json` parse with `python3 -m json.tool` and contain schema, provenance, and redaction metadata.
- [ ] `fixtures/omnigent/events/*.json`, `fixtures/omnigent/errors/*.json`, and `fixtures/omnigent/fake-server/scenarios.json` parse with `python3 -m json.tool` and cover normal terminal, malformed event, reconnect, cancel, close, history, and unavailable-feature scenarios where source evidence allows.
- [ ] The capability matrix records each required capability as `supported`, `emulated`, `unavailable`, or `blocked`; no capability is left as unknown in `docs/omnigent-contract.md`.
- [ ] `specs/agent-runtime-provider-omnigent-spec.md` references IF-0-CONTRACT-1 and does not promote unverified Omnigent behavior into downstream implementation requirements.
- [ ] The automation suite command in `## Verification` passes, and closeout lists IF-0-CONTRACT-1 as the produced gate only after the contract package verifies.

## Verification

- automation.suite_command: `git diff --check -- docs/omnigent-contract.md specs/agent-runtime-provider-omnigent-spec.md fixtures/omnigent && find fixtures/omnigent -name '*.json' -print | sort | xargs -r -n1 python3 -m json.tool >/dev/null && rg -n "Supported Version|Source Provenance|HTTP API Surface|CLI Surface|Event Stream|Error Taxonomy|Capability Matrix|Lifecycle Semantics|Fixture Index|Downstream Decisions" docs/omnigent-contract.md && rg -n "IF-0-CONTRACT-1|docs/omnigent-contract.md" specs/agent-runtime-provider-omnigent-spec.md`
- Lane checks: run the `verify` command from each lane after its implementation task.
- Whole-phase check: run `git status --short -- docs/omnigent-contract.md fixtures/omnigent specs/agent-runtime-provider-omnigent-spec.md` and confirm only phase-owned paths are dirty.
