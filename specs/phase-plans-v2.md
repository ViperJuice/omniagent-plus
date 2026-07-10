# GP consumes the AgentRuntimeProvider seam — Phase Plan v2

> How to use this document: save to `specs/phase-plans-v2.md`, then run `/claude-plan-phase <ALIAS>` to produce the lane-level plan for each phase (→ `plans/phase-plan-v2-<alias>.md`), then `/claude-execute-phase <alias>` to build it.

> Scope note: this is a **separate initiative** from `specs/phase-plans-v1.md`. v1 is the full-depth build of the `agent-runtime-provider-omnigent` provider layer inside `omniagent-plus`. v2 is the narrow cross-repo integration that makes `governed-pipeline` (gp) the seam's first real, governed consumer, with `agent-harness` as the reference prototype. v2 depends on v1's `IF-0-ADAPTERS-10` adapter surface already existing in source; it does not re-open v1's phases.

> Panel provenance: shape is unanimous across the 4-vendor advisory panel (codex/grok/agy CLI legs + a claude governance leg). The one genuine 3-vs-1 split — package-vs-port sequencing — is preserved as an explicit maintainer DECISION POINT (see Assumptions), not silently resolved.

---

## Context

The Consiliency fleet has an advisor-panel-reviewed seam contract — `agent-runtime-provider-omnigent.v0.1` (`omniagent-plus/specs/agent-runtime-provider-omnigent-spec.md`). The seam and its gp adapter **already exist in source** but are not yet consumable end-to-end:

- `omniagent-plus` ships 10 packages, ALL `private:true`, source-only (`exports.types → ./src/*.ts`, no build), unpublished. The three that matter here: `@omniagent-plus/core-contracts` (`AgentRuntimeProvider` interface + zod `schemas.ts` + `FakeAgentRuntimeProvider`), `@omniagent-plus/governed-pipeline-adapter` (`mapInvokeAgenticHarnessRequest` / `mapExecutorAdapterResult` + `examples/governed-pipeline/*.json` fixtures + `dependency-direction.test.ts` + freeze gate `IF-0-ADAPTERS-10`), and `@omniagent-plus/omnigent-transport` (the live `OmnigentHttpProvider` HTTP path).
- `agent-harness` is the **prototype consumer (done)**: `phase_loop_runtime/agent_runtime_provider.py` ports the interface to a Python `Protocol` with `HomebrewAgentRuntimeProvider` (the advisor panel already routes legs through it, CS-0.8) and `OmnigentAgentRuntimeProvider` (agent-harness#101, merged). It is the language-neutral conformance baseline.
- `governed-pipeline` **does NOT consume the seam yet**. Its agentic boundary is `packages/pipeline-runtime/src/harness/invoke.mjs` `invokeAgenticHarness(options) → invokeNativeHarness(...)`, dispatching to per-harness native invokers (codex/claude/gemini/opencode/pi/phase-loop/fake). `loadPipelineRuntimeConfig` requires a per-repo `adapterModulePath`. gp `package.json` has no `@omniagent-plus/*` dependency.

**Thesis (panel-unanimous):** introduce an **opt-in, execution-only** provider path in gp. The seam only *dispatches a turn*; gp keeps **all** governance, ratification, run-mode, worktree-lease authority, and identity semantics unchanged. Two load-bearing risks drive the phase order: (1) packaging — gp cannot depend on private, unbuilt packages, so publish-hardening the seam packages is the depend-path prerequisite; (2) cross-language drift — the contract has three copies (TS spec, agent-harness Python, gp TS), so a language-neutral conformance golden must exist and pass against the agent-harness Python baseline **before** gp consumes, so gp is "born conformant." Then a single opt-in branch in gp proves the seam is load-bearing, and a thin external-caller vertical proves an outside agent can drive a *governed* gp run through the seam without bypassing governance.

---

## Architecture North Star

```text
   ┌──────────────────────────┐
   │  external agent / caller │   drives ONE governed gp phase
   │  (Node; owns nothing gp) │
   └────────────┬─────────────┘
                │  harness: "provider"  (opt-in; NO silent fallback)
                ▼
   ┌──────────────────────────────────────────────────────┐
   │  governed-pipeline (gp)                                │
   │                                                        │
   │  invokeAgenticHarness(options)                         │
   │    ├─ harness === "provider" ──► invokeProviderHarness │  ◄─ NEW leaf branch
   │    └─ else ─────────────────────► invokeNativeHarness  │  (byte-unchanged default)
   │                                                        │
   │  invokeProviderHarness  (routes THROUGH adapterModulePath;
   │    map*Request ─► createSession ─► sendTurn ─► close     │   binds gp governance/run-mode)
   │              ─► map*Result ─► gp executor-adapter shape  │
   │                          │                              │
   │                          ▼                              │
   │        UNCHANGED gp governance / ratify path            │  ◄─ provider output is FACTS-ONLY,
   │        (gp OWNS the ledger + worktree-lease authority;  │      UNTRUSTED until gp ratifies;
   │         gp derives the ratify verdict itself)           │      no verdict passed INTO provider
   └────────────────────────────┬───────────────────────────┘
                                │  AgentRuntimeProvider seam (execution-only, facts-only)
                                ▼
   ┌──────────────────────────────────────────────────────┐
   │  @omniagent-plus/* (leaf; imports no consumer internals)│
   │    core-contracts: AgentRuntimeProvider + Fake + zod    │
   │    governed-pipeline-adapter: map*Request/map*Result    │
   │    (omnigent-transport: live HTTP path — DEFERRED)      │
   └──────────────────────────────────────────────────────┘
                                ▲
                                │  same cross-language contract (the golden)
                ┌───────────────┴───────────────┐
                │  agent-harness (Python port)   │  conformance baseline (authored FIRST)
                │  agent_runtime_provider.py     │
                └────────────────────────────────┘
```

---

## Assumptions (fail-loud if wrong)

1. **DECISION POINT — maintainer must confirm before planning GPBRANCH: package-vs-port sequencing** (the one genuine 3-vs-1 panel split). Both legs agree package maturity is THE risk and the CONFORM golden is the shared guard; they differ only on sequencing:
   - **DEPEND-path (codex/grok/agy — 3 legs; the default this plan assumes):** PUBHARDEN lands first; gp DEPENDS on the built `@omniagent-plus` packages — no 3rd copy of the contract. Gated by PUBHARDEN's **P0a consumability proof** (`IF-0-PUBHARDEN-1`).
   - **PORT-now fallback (claude — 1 leg):** if P0a slips or package maturity is unproven, gp PORTS a minimal `AgentRuntimeProvider` interface now (born conformant via `IF-0-CONFORM-1`), unblocking gp immediately, then COLLAPSES the port into the TS dependency later once the package is proven (3 copies → 2).
   - This plan encodes BOTH without picking silently: PUBHARDEN's P0a gates the depend-path, and GPBRANCH's dependency-acquisition lane (L-DEPS) carries the port-now fallback as its alternate implementation, activated only if P0a slips. The CONFORM golden precedes and gates GPBRANCH under either leg. Confirm the default (depend-path) or elect port-now.
2. The three `@omniagent-plus` packages build cleanly to `dist/` with `tsc` and expose the same runtime symbols they expose today via `src/` — no source refactor, packaging only.
3. `FakeAgentRuntimeProvider` is CI-stable and can complete one `createSession → sendTurn → closeSession` turn with zod-validated inputs from a standalone consumer that imports only the package (no repo-internal imports).
4. gp's `invokeAgenticHarness` / `invokeNativeHarness` boundary is the correct injection point; an opt-in `harness: "provider"` branch there does not require touching gp's governance/ratify path, and the provider path still binds the per-repo `adapterModulePath` governance/run-mode config.
5. gp's existing executor-adapter result shape is stable enough that `mapExecutorAdapterResult(...)` produces it without a governance-path change.
6. `agent-harness`'s `phase_loop_runtime/agent_runtime_provider.py` is the authoritative language-neutral conformance baseline; the golden can be authored against the contract source + fixtures and run against the Python provider WITHOUT the TS packages being built (so CONFORM is a root, parallel to PUBHARDEN).
7. v1's `IF-0-ADAPTERS-10` adapter API surface is present in `omniagent-plus` source and will not be re-shaped by concurrent v1 work during this roadmap. (If v1's ADAPTERS phase is still in flux, serialize against `omniagent-plus/packages/governed-pipeline-adapter/`.)

---

## Non-Goals

- **Live `OmnigentHttpProvider` streaming.** `omnigent-transport` is publish-hardened for consumability only; the live HTTP transport path is not wired into gp in this roadmap.
- **Adapter-of-adapters.** Native invokers (codex/claude/gemini/opencode/pi/phase-loop/fake) are NOT rewritten to become one provider impl. The provider path is a parallel opt-in branch, not a replacement.
- **Worktree leasing done BY the provider as authority, handoff packets, identity/profile lanes, multi-turn sessions.** All deferred. (Worktree-lease *authority* stays with gp throughout — see Cross-Cutting Principles.)
- **Changing gp's governance, ratify, or run-mode semantics.** The seam is execution-only; governance is untouched.
- **Silent fallback** provider → native on error. Explicitly forbidden (it hides identity/timeout/lifecycle failures).
- **Re-opening `omniagent-plus/specs/phase-plans-v1.md`.** v2 consumes v1's `IF-0-ADAPTERS-10` surface; it does not modify v1 phases.

---

## Cross-Cutting Principles

1. **Execution-only seam.** The `AgentRuntimeProvider` seam dispatches a turn and returns a result. It carries no governance authority. Everything crossing back into gp is data, not a decision.
2. **gp owns governance.** Provider output is **untrusted until gp ratifies it** through the UNCHANGED governance/ratify path. The provider path funnels through the same ratification as native results.
3. **FACTS-ONLY seam surface.** The seam carries only facts — events, text, exit codes, turn-state. A ratify verdict is NEVER passed INTO the provider, and a provider-reported "completed" is NEVER treated as a governance pass. gp derives the verdict itself, independently, from the facts.
4. **gp owns worktree-lease authority + the ledger.** gp — not the provider — is the authority over which worktree/branch a governed run targets, and gp OWNS the run ledger. The provider may lease a worktree only under gp's direction; double-ownership is forbidden.
5. **`adapterModulePath` still binds governance on the provider path.** The provider path routes THROUGH the per-repo `adapterModulePath` (governance/run-mode config still applies); it never bypasses the adapter to reach an executor directly.
6. **Identity/auth material never lands in ledger or logs.** Vendor-key header metadata is pass-through and **never-silent-key** (a missing required key fails loud, never silently proceeds). Auth material (keys, tokens, headers) MUST NOT be written to the ledger or logs.
7. **DEPEND, do not port (for gp), when the package is proven.** gp depends on published/pinned `@omniagent-plus/*` packages rather than re-porting the interface. The port-now fallback (Assumption 1) is a temporary bridge that collapses to the dependency once P0a is green. agent-harness's existing Python port stays; the golden keeps all copies from drifting.
8. **No silent fallback.** `harness: "provider"` is an explicit opt-in. On provider failure the run fails loud; it never silently degrades to native dispatch.
9. **Leaf-adapter dependency direction.** `@omniagent-plus/*` adapters may depend on provider core contracts and public consumer schemas, but MUST NOT import gp or agent-harness internals. `invoke-provider.mjs` is a leaf that imports the adapter; the adapter never imports gp. Enforced by `dependency-direction.test.ts`.
10. **Native path byte-unchanged.** Every existing native-executor test stays byte-identical and green. The default (no `harness: "provider"`) code path is untouched.
11. **Repo-qualified references.** This is a multi-repo fleet; issue/PR numbers are always written `agent-harness#NNN` / `governed-pipeline#NNN` / `omniagent-plus#NNN`, never a bare `#NNN`.

---

## Phase Dependency DAG

```text
  PUBHARDEN                          CONFORM
  (omniagent-plus;                   (golden + agent-harness Python
   P0a consumability proof            baseline; authored FIRST;
   gates the depend-path)             precedes + gates GPBRANCH)
        \                              /
         \  (default depend-path edge;/
          \  relaxed if P0a slips →  /
           \  port-now fallback)    /
            ▼                      ▼
                   GPBRANCH
        (gp; born-conformant against the golden;
         opt-in provider branch; governance invariants asserted)
                       │
                       ▼
                     DEMO
             (thinnest governed vertical)
```

- Both `PUBHARDEN` and `CONFORM` are **roots** and run concurrently.
- Critical path (default depend-path): `max(PUBHARDEN, CONFORM) → GPBRANCH → DEMO`.
- The `PUBHARDEN → GPBRANCH` edge is the depend-path default; if P0a slips, GPBRANCH's L-DEPS lane switches to the port-now fallback and that edge is relaxed (CONFORM still gates GPBRANCH).

---

## Top Interface-Freeze Gates

These gates are the narrowest contracts that unblock downstream phases. `/claude-plan-phase` concretizes each (exact signature/schema/version) when it plans the owning phase. (v1's adapter freeze gate — the `governed-pipeline-adapter` API surface — is an **upstream** input to this roadmap, not produced here.)

1. **IF-0-PUBHARDEN-1** — the **consumable package surface** for `@omniagent-plus/core-contracts` and `@omniagent-plus/governed-pipeline-adapter`: `private` removed; a real `tsc` build to `dist/`; `exports` map pointing at built `./dist/*.js` + `./dist/*.d.ts` (not `./src/*.ts`); a pinned consumable version (npm publish OR a resolvable `git`/`file:` spec). Includes the **P0a consumability proof** (a standalone consumer completes one `FakeAgentRuntimeProvider` turn) that gates gp's depend-path. Frozen importable symbols: `FakeAgentRuntimeProvider`, `AgentRuntimeProvider`, `mapInvokeAgenticHarnessRequest`, `mapExecutorAdapterResult`.
2. **IF-0-CONFORM-1** — the **frozen golden fixture set** + pinned `@omniagent-plus/*` version asserting four cross-language invariants: method names (`createSession`/`sendTurn`/`readHistory`/`closeSession`), event-type strings, terminal states, and error categories — established against the `agent-harness` Python baseline FIRST, and consumed by gp as the born-conformant gate.
3. **IF-0-GPBRANCH-1** — the **provider-executor-result contract**: the `harness: "provider"` (or `options.runtimeProvider`) opt-in switch on `invokeAgenticHarness`, and the shape `invokeProviderHarness(options)` returns — gp's existing executor-adapter result shape, produced by `mapExecutorAdapterResult(...)`, flowing through the UNCHANGED governance/ratify path. Includes the provider-injection contract (per-repo `adapterModulePath`, default `FakeAgentRuntimeProvider`) that still binds governance/run-mode.
4. **IF-0-DEMO-1** — the **reference governed-provider vertical**: the external-caller entrypoint + assertion contract proving provider output is untrusted-until-ratified, native tests unchanged, governance fails-closed without adapter config, and no auth material in ledger/logs.

---

## Phases

### Phase 0 — Publish-harden the seam packages (PUBHARDEN)

**Objective**
Make `@omniagent-plus/{core-contracts,governed-pipeline-adapter,omnigent-transport}` consumable from a standalone project — un-private, build to `dist/`, real `exports`, pinned version — and prove `FakeAgentRuntimeProvider` completes one turn from a consumer that imports only the package (the **P0a** proof that gates gp's depend-path). This is the panel's #1 risk and the prerequisite for the depend-path.

**Exit criteria**
- [ ] `cd omniagent-plus && pnpm -r build` produces `dist/` for the three packages with `.js` + `.d.ts` entrypoints matching each package's `exports` map.
- [ ] None of the three packages carries `"private": true`; each has a pinned consumable version and an `exports` map pointing at `./dist/*`, not `./src/*.ts`.
- [ ] **P0a:** a standalone smoke script (`omniagent-plus/scripts/smoke-fake-provider.mjs`) that imports only `@omniagent-plus/core-contracts` runs `new FakeAgentRuntimeProvider()` through one `createSession → sendTurn → closeSession` turn and exits 0.
- [ ] The package installs into a scratch directory (`npm pack` tarball or pinned `git`/`file:` spec) and the smoke script passes from there — no repo-internal imports resolved.
- [ ] `dependency-direction.test.ts` still green (adapter imports no consumer internals).

**Scope notes**
- Decompose into 4 lanes, one per package plus a smoke/consumability lane:
  - **L-CORE** — `omniagent-plus/packages/core-contracts/` (un-private, `tsc`→`dist/`, `exports`, version).
  - **L-ADAPTER** — `omniagent-plus/packages/governed-pipeline-adapter/` (same; preserves the `IF-0-ADAPTERS-10` surface and `examples/governed-pipeline/*.json`).
  - **L-TRANSPORT** — `omniagent-plus/packages/omnigent-transport/` (build/`exports`-only; live `OmnigentHttpProvider` path stays a non-goal — this lane makes the package installable, it does NOT wire live transport).
  - **L-SMOKE** — `omniagent-plus/scripts/smoke-fake-provider.mjs` + scratch-dir consumability check (P0a) + CHANGELOG entry.
- **Single-writer files**: root `omniagent-plus/pnpm-workspace.yaml`, root `tsconfig*.json`, and shared build config are single-writer — assign to **L-CORE** (it lands first); L-ADAPTER/L-TRANSPORT extend per-package `tsconfig`/`package.json` only. L-SMOKE consumes L-CORE's built output, so it starts once L-CORE freezes the `exports` shape (intra-phase freeze).
- P0a is the gate the maintainer's decision point hinges on: if it is green, gp takes the depend-path; if it slips, GPBRANCH's L-DEPS falls back to port-now.
- The publish itself is a public-surface change → decision gate: cross-vendor CR before npm publish (or land as a pinned `git`/`file:` dep first as the lower-friction path). See `public-repo-admin-merge-cr-gate`.

**Non-goals**
- Wiring the live `OmnigentHttpProvider` HTTP transport into any consumer.
- Any change to the provider interface symbols themselves (packaging only).

**Key files**
- `omniagent-plus/packages/core-contracts/package.json`
- `omniagent-plus/packages/governed-pipeline-adapter/package.json`
- `omniagent-plus/packages/omnigent-transport/package.json`
- `omniagent-plus/packages/*/tsconfig.json`, `omniagent-plus/pnpm-workspace.yaml`, `omniagent-plus/tsconfig*.json`
- `omniagent-plus/scripts/smoke-fake-provider.mjs` (create)
- `omniagent-plus/CHANGELOG.md`

**Depends on**
- (none)

**Produces**
- IF-0-PUBHARDEN-1

**Spec closeout policy**
- schema: `spec_delta_closeout.v1`
- decision: `canonical_spec_update`
- target surfaces: `omniagent-plus/packages/{core-contracts,governed-pipeline-adapter,omnigent-transport}/package.json`, `omniagent-plus/CHANGELOG.md`
- evidence paths: `omniagent-plus/dist-build.log`, `omniagent-plus/scripts/smoke-fake-provider.out`
- redaction posture: `metadata_only`
- routing: on missing/malformed build or smoke evidence, `blocker_class=contract_bug` (non-human).

---

### Phase 1 — Cross-language conformance golden + baseline (CONFORM)

**Objective**
Freeze a language-neutral golden fixture set — method names, event-type strings, terminal states, error categories — and establish it against the `agent-harness` Python provider baseline FIRST, so gp's later consumption (or port) is "born conformant" against a proven contract. Authored from the contract source + fixtures; does not need the TS packages built.

**Exit criteria**
- [ ] A canonical golden set lives in `omniagent-plus/examples/` naming the four invariants (method names, event strings, terminal states, error categories) with a pinned schema version.
- [ ] An `agent-harness` Python conformance test asserts `phase_loop_runtime/agent_runtime_provider.py` matches the golden (the baseline).
- [ ] Deliberately mutating one event-string in a scratch copy makes the agent-harness Python conformance test fail (the guard bites at the baseline).
- [ ] The golden is versioned and referenceable so GPBRANCH can pin it as the born-conformant gate (`IF-0-CONFORM-1`).

**Scope notes**
- Decompose into 2 lanes, disjoint by repo:
  - **L-GOLDEN** — `omniagent-plus/examples/` canonical fixtures + version pin (owns the golden files; publishes IF-0-CONFORM-1 on day one so the baseline lane asserts against a frozen set).
  - **L-AH-BASELINE** — `agent-harness/**` Python conformance test against the golden + the mutation negative-case proving the guard bites.
- **This phase is a ROOT — it depends on NOTHING and runs concurrently with PUBHARDEN.** It conforms against the contract *source* + `agent-harness`'s Python provider, NOT against gp's runtime branch or the built TS packages. The gp-side conformance assertion deliberately lives in GPBRANCH (the "born conformant" exit), not here — do not add a phantom PUBHARDEN or GPBRANCH edge.
- Running against agent-harness Python first is the panel's explicit sequencing: establish the baseline before any gp consumption exists.

**Non-goals**
- Testing gp's runtime provider branch (that is GPBRANCH's born-conformant exit + DEMO); CONFORM tests the static contract shape against the Python baseline only.

**Key files**
- `omniagent-plus/examples/governed-pipeline/*.json` (extend into the canonical golden set)
- `agent-harness/phase_loop_runtime/agent_runtime_provider.py` (assert against; do not reshape)
- `agent-harness/**` conformance test (new)

**Depends on**
- (none)

**Produces**
- IF-0-CONFORM-1

**Spec closeout policy**
- schema: `spec_delta_closeout.v1`
- decision: `canonical_spec_update`
- target surfaces: `omniagent-plus/examples/governed-pipeline/*.json`
- evidence paths: `omniagent-plus/conformance-agent-harness.log`, `omniagent-plus/conformance-mutation.log`
- redaction posture: `metadata_only`
- routing: on missing/malformed conformance or mutation evidence, `blocker_class=contract_bug` (non-human).

---

### Phase 2 — GP opt-in provider branch (GPBRANCH)

**Objective**
Add an explicit, opt-in `harness: "provider"` branch to gp's `invokeAgenticHarness` that maps a request → `createSession`/`sendTurn`/`closeSession` → an executor-adapter result via the omniagent-plus adapter, flowing through gp's UNCHANGED governance/ratify path. gp is born-conformant against `IF-0-CONFORM-1`; native default stays byte-unchanged; no silent fallback; gp retains governance, worktree-lease, and identity authority.

**Exit criteria**
- [ ] Dependency acquired: on the depend-path, `governed-pipeline/package.json` + `packages/pipeline-runtime/package.json` pin `@omniagent-plus/core-contracts` and `@omniagent-plus/governed-pipeline-adapter` (against `IF-0-PUBHARDEN-1`); on the port-now fallback, a minimal `AgentRuntimeProvider` interface is ported into gp with a documented collapse-to-dependency path.
- [ ] `invokeAgenticHarness` routes to `invokeProviderHarness(options)` when `options.harness === "provider"` (or `options.runtimeProvider` is set); otherwise the existing native dispatch is byte-unchanged.
- [ ] `invokeProviderHarness` (`packages/pipeline-runtime/src/harness/invoke-provider.mjs`) runs `mapInvokeAgenticHarnessRequest → createSession → sendTurn → consume-to-terminal/read_history → closeSession → mapExecutorAdapterResult` and returns gp's existing executor-adapter result shape.
- [ ] **Born-conformant:** gp's consumption passes the `IF-0-CONFORM-1` golden; mutating one event-string in a scratch copy makes gp's conformance test fail.
- [ ] **`adapterModulePath` still binds governance/run-mode on the provider path** — the provider routes THROUGH the adapter, never bypassing it to reach an executor directly.
- [ ] **gp retains worktree-lease authority + ledger ownership** — the provider may lease a worktree only under gp's direction; the governed run's ledger is written by gp, not the provider (no double-ownership).
- [ ] **No auth material in ledger/logs** — vendor-key header metadata is pass-through and never-silent-key (a missing required key fails loud); no keys/tokens/headers are written to the ledger or logs.
- [ ] **FACTS-ONLY seam** — the provider returns only facts (events/text/exit/turn-state); gp derives the ratify verdict itself. A provider-reported "completed" is NOT treated as a governance pass, and no verdict is passed INTO the provider.
- [ ] The provider instance is injected via `adapterModulePath` (default `FakeAgentRuntimeProvider`); `invoke-provider.mjs` imports no gp internals (leaf rule).
- [ ] A new unit test maps request → session → result through the provider branch; **every existing native-executor test is byte-unchanged and green**; there is NO provider→native fallback path.

**Scope notes**
- Decompose into 5 lanes:
  - **L-DEPS** — dependency acquisition. ONE lane with two mutually-exclusive implementations gated by the decision point (Assumption 1): (a) depend-path — pin the built `@omniagent-plus` deps + lockfile (P0a green); (b) port-now fallback — port a minimal interface into gp with a collapse-to-dependency TODO (P0a slipped). Publishes the resolved import surface early (intra-phase freeze) so L-PROVIDER imports against it. Do NOT plan (a) and (b) concurrently — they are alternatives.
  - **L-BRANCH** — the opt-in switch inside `packages/pipeline-runtime/src/harness/invoke.mjs`. **`invoke.mjs` is single-writer — L-BRANCH owns it**; the switch is a strict superset leaving the native path byte-identical. Freeze `IF-0-GPBRANCH-1` on day one so sibling lanes assert against it.
  - **L-PROVIDER** — create `packages/pipeline-runtime/src/harness/invoke-provider.mjs` (map→session→result body; routes through `adapterModulePath`; leaf).
  - **L-GOVERNANCE** — the governance-invariant assertions: `adapterModulePath`-binds-governance, worktree-lease-authority-stays-with-gp, no-auth-in-ledger/never-silent-key, FACTS-ONLY (no verdict into/out of provider). Owns governance-assertion test files.
  - **L-CONFORM-GP** — gp born-conformant test against the `IF-0-CONFORM-1` golden + gp-side mutation negative case; native-byte-unchanged guard (checksum/no-diff on native test files).
- L-PROVIDER depends on L-DEPS's import surface + the `mapExecutorAdapterResult` output shape (freeze as `IF-0-GPBRANCH-1` on L-BRANCH's day one).
- Serialize against gp's `packages/pipeline-runtime/src/harness/` if GP-RUNNER / un-vendor R3 work touches the same tree (see `fleet-unification-spine-vs-outer-ring`).

**Non-goals**
- Any governance/ratify code change; any change to `loadPipelineRuntimeConfig` beyond reading the provider `adapterModulePath`.
- Multi-turn sessions, live transport, handoff packets, provider-as-worktree-authority.

**Key files**
- `governed-pipeline/package.json`, `governed-pipeline/packages/pipeline-runtime/package.json`
- `governed-pipeline/packages/pipeline-runtime/src/harness/invoke.mjs` (modify; single-writer)
- `governed-pipeline/packages/pipeline-runtime/src/harness/invoke-provider.mjs` (create)
- `governed-pipeline/packages/pipeline-runtime/src/harness/*.test.mjs` (add provider + governance + conformance tests; do not edit native tests)
- `governed-pipeline/CHANGELOG.md`

**Depends on**
- PUBHARDEN
- CONFORM

**Produces**
- IF-0-GPBRANCH-1

**Spec closeout policy**
- schema: `spec_delta_closeout.v1`
- decision: `no_spec_delta`
- target surfaces: `governed-pipeline/packages/pipeline-runtime/src/harness/invoke.mjs`, `governed-pipeline/packages/pipeline-runtime/src/harness/invoke-provider.mjs`
- evidence paths: `governed-pipeline/test-native-unchanged.log`, `governed-pipeline/test-provider-path.log`, `governed-pipeline/test-governance-invariants.log`, `governed-pipeline/conformance-gp.log`
- redaction posture: `metadata_only`
- routing: on missing/malformed test evidence, `blocker_class=contract_bug` (non-human).

---

### Phase 3 — Thinnest governed vertical demo (DEMO)

**Objective**
Prove the goal end-to-end with the smallest load-bearing vertical: an external Node caller drives ONE existing gp governed phase via `harness: "provider"` + `FakeAgentRuntimeProvider`, and gp's governance still owns the outcome.

**Exit criteria**
- [ ] An external Node caller (owns no gp internals) drives one existing gp governed phase/tick through `harness: "provider"` + `FakeAgentRuntimeProvider`.
- [ ] The demo test asserts provider output is **untrusted until gp ratifies** it (governance ran, was not bypassed; the verdict is gp's, not the provider's "completed").
- [ ] The demo test asserts the default native-path tests remain unchanged and green.
- [ ] The demo test asserts governance **fails closed** when `adapterModulePath` / provider config is missing (no silent success, no fallback to native).
- [ ] The demo test asserts **no auth/identity material appears in the ledger or logs** for the governed run.
- [ ] A correlated session id is visible end-to-end (caller → provider → gp result).

**Scope notes**
- Decompose into 2 lanes:
  - **L-CALLER** — `governed-pipeline/examples/provider-demo/` external caller entrypoint that constructs the request and drives one governed phase via the provider branch.
  - **L-ASSERT** — the assertion harness for the governed properties (untrusted-until-ratified, native-unchanged, fails-closed-without-config, no-auth-in-ledger/logs, correlated-session-id). Owns test files; disjoint from the caller entrypoint.
- Terminal phase — no downstream freeze; IF-0-DEMO-1 documents the reference vertical for future consumers.
- Depends on GPBRANCH for the `harness: "provider"` branch. Uses only `FakeAgentRuntimeProvider` (from PUBHARDEN) — no live transport.

**Non-goals**
- Any real agent/backend; live `OmnigentHttpProvider`; multi-turn; new gp governed phases (reuse an existing one).

**Key files**
- `governed-pipeline/examples/provider-demo/*.mjs` (create)
- `governed-pipeline/**` demo/vertical test (create)
- `governed-pipeline/packages/pipeline-runtime/src/harness/invoke-provider.mjs` (consume; do not modify)

**Depends on**
- GPBRANCH

**Produces**
- IF-0-DEMO-1

**Spec closeout policy**
- schema: `spec_delta_closeout.v1`
- decision: `no_spec_delta`
- target surfaces: `governed-pipeline/examples/provider-demo/`
- evidence paths: `governed-pipeline/demo-vertical.log`
- redaction posture: `metadata_only`
- routing: on missing/malformed demo evidence, `blocker_class=contract_bug` (non-human).

---

## Execution Notes

- **Planning**: `/claude-plan-phase PUBHARDEN` and `/claude-plan-phase CONFORM` have **no shared DAG ancestor** and can be planned and executed **concurrently** from day one. `/claude-plan-phase GPBRANCH` after both land (confirm the Assumption-1 decision point first). `/claude-plan-phase DEMO` after GPBRANCH.
- **Execution**: `/claude-execute-phase pubharden` ∥ `/claude-execute-phase conform` → `/claude-execute-phase gpbranch` → `/claude-execute-phase demo`.
- **Critical path** (default depend-path): `max(PUBHARDEN, CONFORM) → GPBRANCH → DEMO`. If P0a slips, GPBRANCH's L-DEPS takes the port-now fallback and the PUBHARDEN edge is relaxed (CONFORM still gates GPBRANCH), so GPBRANCH is bounded by CONFORM alone.
- **Parallel branches**: PUBHARDEN and CONFORM are independent roots — run them together.
- **Single-writer files across phases**: `governed-pipeline/packages/pipeline-runtime/src/harness/invoke.mjs` is touched only by GPBRANCH (L-BRANCH). `omniagent-plus/examples/governed-pipeline/*.json` is extended only by CONFORM (L-GOLDEN). No phase edits `agent-harness/phase_loop_runtime/agent_runtime_provider.py` (CONFORM asserts against it read-only).
- **Cross-repo**: PUBHARDEN = `omniagent-plus`; CONFORM = `omniagent-plus` + `agent-harness`; GPBRANCH = `governed-pipeline`; DEMO = `governed-pipeline`.

---

## Acceptance Criteria

- [ ] `@omniagent-plus/{core-contracts,governed-pipeline-adapter}` are consumable (built, versioned, un-private) and a standalone script completes one `FakeAgentRuntimeProvider` turn (P0a).
- [ ] The language-neutral golden exists and passes against the `agent-harness` Python baseline; a one-string mutation makes it fail.
- [ ] `gp invokeAgenticHarness({harness:"provider", ...})` runs create→turn→close and returns gp's executor-adapter result through the UNCHANGED governance/ratify path, and gp is born-conformant against the golden.
- [ ] Governance invariants hold on the provider path: `adapterModulePath` binds governance; gp retains worktree-lease authority + ledger ownership; no auth material in ledger/logs; the seam is facts-only (no verdict into/out of the provider).
- [ ] Every existing native executor (codex/claude/gemini/opencode/pi/phase-loop/fake) test is byte-unchanged and green; there is NO silent provider→native fallback.
- [ ] The cross-language conformance golden fails when any of {method name, event string, terminal state, error category} drifts across TS / agent-harness Python / gp.
- [ ] The vertical demo proves provider output is untrusted until gp ratifies, governance fails-closed without adapter config, no auth material leaks to ledger/logs, and a correlated session id is visible end-to-end.

---

## Verification

```bash
# Phase 0 — PUBHARDEN: packages build + Fake completes one turn from a standalone consumer (P0a)
cd ~/code/omniagent-plus && pnpm -r build
node scripts/smoke-fake-provider.mjs               # createSession → sendTurn → closeSession, exit 0
# install into a scratch dir and re-run the smoke from there (no repo-internal imports)

# Phase 1 — CONFORM: golden established against the agent-harness Python baseline (root; parallel to P0)
cd ~/code/agent-harness && python3 -m pytest -k conformance
#   flip one event-string in a scratch copy → the agent-harness conformance test FAILS

# Phase 2 — GPBRANCH: provider branch maps request→session→result; born-conformant; governance invariants
cd ~/code/governed-pipeline && pnpm install && pnpm test
#   new harness:"provider" unit test green; gp conformance vs the golden green (flip a string → fails);
#   governance-invariant tests green (adapterModulePath binds, worktree authority = gp, no auth in ledger/logs, facts-only);
#   ALL existing native-executor tests byte-unchanged and green

# Phase 3 — DEMO: external caller drives one governed gp phase via Fake provider
cd ~/code/governed-pipeline && node examples/provider-demo/run.mjs && pnpm test -- provider-demo
#   asserts: untrusted-until-ratified, native tests unchanged, fails-closed without adapter config,
#            no auth material in ledger/logs, correlated session id
```
