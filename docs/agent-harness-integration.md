# Agent-Harness Integration

`@omniagent-plus/agent-harness-adapter` lets phase-loop launch through an
Omnigent-backed provider while keeping `agent-harness` model policy, effort,
and run_mode authoritative. The adapter consumes only public provider
contracts plus JSON fixtures under `examples/agent-harness/`; it does not read
private `agent-harness` modules, `.phase-loop/` state, or local credentials.

The request mapper translates adapter-local `target_executor` labels to the
canonical provider `HarnessId` values:

- `claude -> claude-code`
- `gemini -> gemini-antigravity`
- `codex -> codex`
- `opencode -> opencode`
- `pi -> pi`

The launch result preserves dry run as event metadata instead of a terminal
status, carries the selected model policy and effort, keeps the unavailable
reason metadata_only and redacted, and preserves the native fallback reason and
typed blocker class without inventing private phase-loop fields.
