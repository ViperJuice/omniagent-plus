# Changelog

All notable changes to the `@omniagent-plus/*` packages are documented here.

## [0.2.0] — 2026-07-10 — PUBHARDEN: consumable seam packages

Make the three seam packages consumable end-to-end (GP-adapter roadmap, PUBHARDEN
phase / IF-0-PUBHARDEN-1). Packaging + distribution only — no provider interface or
governance behavior change.

### Changed
- `@omniagent-plus/core-contracts`, `@omniagent-plus/governed-pipeline-adapter`,
  `@omniagent-plus/omnigent-transport`: removed `"private": true`; bumped to `0.2.0`;
  each now builds to `dist/` via a per-package `tsconfig.build.json` (`tsc`, emit on,
  `*.test.ts` excluded) and its `exports` map points at `./dist/*.js` + `./dist/*.d.ts`
  (was `./src/*.ts`). `files` is `["dist"]` (plus `conformance.v0.1.json` on the adapter).
- `@omniagent-plus/governed-pipeline-adapter`: **preserves the `./conformance` export
  subpath** (IF-0-CONFORM-1) through the `dist` rewrite (single-writer note honored).

### Added
- `@omniagent-plus/core-contracts`: export the failure-vocabulary arrays
  (`runtimeFailureCategories`, `runtimeFailureActors`, `runtimeFailureScopes`) from the
  package index. Additive — exposes existing constants so a consumer (and the TS-vs-golden
  gate) can validate against the contract's error vocabulary. No symbol renamed or removed.
- `test_ts_conformance.test.ts` (adapter): the load-bearing **TS-vs-golden** gate — asserts
  the TS contract conforms to the IF-0-CONFORM-1 golden across all four invariant tables
  (methods via the mapping + a compile-time `keyof AgentRuntimeProvider` bind; events from the
  zod discriminated union; terminal states from the transition tables; error categories from
  the exported array). A one-string golden mutation and an undeclared method spelling both fail.
- `scripts/smoke-fake-provider.mjs` (P0a): a standalone consumer importing ONLY
  `@omniagent-plus/core-contracts` that drives one `createSession → sendTurn → closeSession`
  `FakeAgentRuntimeProvider` turn and exits 0 (proven from a scratch `npm install`).

### Notes
- The live `OmnigentHttpProvider` HTTP transport is NOT wired into any consumer (non-goal);
  `omnigent-transport` is publish-hardened for consumability only and still depends on the
  (unpublished) `@omniagent-plus/state-ledger` — publishing it is out of the GPBRANCH path,
  which needs only `core-contracts` + `governed-pipeline-adapter`.
