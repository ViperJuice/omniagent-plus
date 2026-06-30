# Security And Secrets

Identity isolation uses a metadata_only posture for credentials, runtime
evidence, and status persistence.

## Required Rules

- Persist secret ref ids, auth-volume refs, and `RedactedConfigValue`
  placeholders, not raw secrets.
- Reject bearer tokens, API keys, auth headers, password/token/credential
  fields, and full env dumps before any ledger or handoff write.
- Treat raw events, route decisions, and handoff payloads as unsafe until the
  secret-leak scanner reduces them to metadata_only evidence.

## Identity Boundaries

- `host_env` is only for development profiles with a non-empty env allowlist.
- Shared HTTP stays blocked until per-session HOME, env, credential, and
  auth-volume isolation evidence is proven.
- Per-profile process metadata prevents auth bleed across concurrent identities.

## Evidence Posture

- Status records may include profile id, provider, harness, counts, cooldown,
  and checked timestamps.
- Status records must not include raw provider payloads, secret file contents,
  or full env maps.
