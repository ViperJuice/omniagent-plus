# Identity Isolation

`IF-0-IDENTITY-6` freezes the identity package boundary for profile loading,
`host_env` policy, env allowlist handling, secret ref metadata, and Omnigent
process isolation.

## Profile Model

- Each identity profile carries provider, harness, isolation mode, concurrency
  bounds, auth-volume ref, home directory ref, process owner, network policy,
  and tool policy metadata.
- `host_env` is development-only and requires an explicit env allowlist. Shared
  and production profiles must use isolated home or stronger isolation.
- Secret material stays in secret ref metadata and `RedactedConfigValue`
  placeholders. The package does not read or persist raw credentials.

## Redaction And Status

- Preflight emits metadata_only diagnostics and writes `IdentityProfileStatus`
  records without raw env values, bearer tokens, or auth headers.
- Secret leak scanning rejects full env dumps, raw events, handoff excerpts, and
  other data that would bypass metadata_only persistence.

## Omnigent Policy

- Shared HTTP mode remains blocked unless explicit per-session HOME, env,
  credential, and auth-volume isolation evidence is present.
- CLI and hybrid launches create one process profile per active identity to
  avoid auth bleed.

## Release Surfaces

This phase updates `docs/identity-isolation.md` and
`docs/security-and-secrets.md`. README, CHANGELOG, and release-note surfaces
stay `no_doc_delta` because IDENTITY is a non-dispatch phase.
