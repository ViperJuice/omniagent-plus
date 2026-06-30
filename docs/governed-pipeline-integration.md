# Governed-Pipeline Integration

`@omniagent-plus/governed-pipeline-adapter` keeps the governed-pipeline side of
the contract behind `invokeAgenticHarness` with `harness = omnigent` and an
explicit `target_harness`. The adapter consumes only public
`@omniagent-plus/core-contracts` types plus JSON fixtures under
`examples/governed-pipeline/`; it does not import consumer repo internals,
`.phase-loop/` runtime state, or private configuration.

The request mapper preserves the selected provider and target_harness labels
from the public `route_decision.v0.1` fixture. The result mapper emits
`executor_adapter_result.v0.1` with:

- `policy.silent_downgrade = false`
- the native fallback reason
- a typed blocker class
- a bounded redacted `log_excerpt`
- metadata_only runtime ledger citations

Release surfaces outside this package do not change in ADAPTERS. The
phase-level doc delta decision is `no_doc_delta` for `README.md`, changelog
surfaces, and release notes because this phase only adds optional leaf
adapters and does not dispatch a release workflow.
