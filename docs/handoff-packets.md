# Handoff Packets

`IF-0-HANDOFF-8` freezes the handoff packet and renderer contract used to move
work between harness targets without treating untrusted evidence as
instructions.

## Trusted Surface

Trusted task fields stay outside the evidence bundle:

- `objective`
- `taskContract`
- `facts`
- `decisions`
- `assumptions`
- `risks`
- `openQuestions`
- `contextPolicy`
- `requiredOutput`

The packet builder validates that trusted fields are bounded metadata and do
not carry secret-bearing values, provider payloads, or environment dumps.

## Untrusted Evidence

Logs, diffs, command output, prior-agent summaries, and raw history remain
untrusted evidence even when the packet includes redacted excerpts. Renderer
targets for Codex, Claude Code, Gemini Antigravity, OpenCode, Pi, and custom
harnesses place evidence only in labeled untrusted sections.

Evidence rules:

- metadata_only paths must stay repo-relative for evidence refs
- raw history is optional and omitted when `rawHistoryAllowed` is false
- raw history is capped by `rawHistoryMaxItems`
- excerpts are redacted and bounded before rendering
- prompt injection strings remain quoted evidence, not trusted instructions

## Packet Builder Inputs

The builder consumes:

- workspace state metadata
- worktree lease refs and diff summaries
- changed and inspected file refs
- command, test, diff, and log summaries with optional redacted excerpts
- prior-agent summaries
- optional raw history excerpts

The packet builder rejects secrets, env dumps, provider payloads, absolute
secret paths, and unbounded transcript content before packet construction.

## Renderer Contract

Every renderer emits two explicit sections:

- a trusted section for task contract and required output
- an untrusted section for quoted JSON evidence

The untrusted section is emitted as prefixed literal JSON lines so hostile
strings such as markdown fences, XML-ish tags, shell commands, and
system/developer/operator-looking text stay quoted.

## Release Surface Decision

HANDOFF updates this package-local public surface and its docs only. It records
`metadata_only` evidence, keeps the non-dispatch release surface bounded to this
doc and package exports, and does not require README, CHANGELOG, or release-note
changes in this phase.
