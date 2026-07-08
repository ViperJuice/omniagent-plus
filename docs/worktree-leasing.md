# Worktree Leasing

`@omniagent-plus/worktree-leasing` satisfies `IF-0-WORKTREE-7`.

## Lease Model

- Every exclusive lease carries a unique fencing token and durable holder
  identity.
- Heartbeat renewal keeps the same fencing token while advancing `renewedAt`
  and `expiresAt`.
- The package builds on the durable `@omniagent-plus/state-ledger` record
  surface so worktree lease history stays metadata_only and cross-process.
- CS-2.2 also exports a Consiliency `LeaseStore` adapter for soft/hard
  off-device coordination leases. The local file backend supports deterministic
  tests and operator dry runs; the Supabase backend delegates hard-mode atomic
  acquire to database RPCs.

## Placement And Branch Rules

- When `/mnt/workspace` exists, created worktrees live under
  `/mnt/workspace/worktrees/<project>-<branch>`.
- Hosts without that mount fall back to repo-adjacent placement.
- Branch collision stays fail-closed unless the caller explicitly requests a
  clean sequential continuation for the same task.
- Path traversal, shell-interpreted branch names, and symlink escape roots are
  rejected before worktree creation.

## Recovery And Cleanup

- Stale recovery requires lease expiration, missing local process liveness,
  matching host identity, clean branch state, clean dirty worktree evidence,
  and ledger evidence before reuse or cleanup.
- Cleanup verifies the active fencing token and refuses dirty worktree,
  unknown-state, different-host, branch-divergent, and active-process
  deletions.
- Read-only reviewer worktrees remain untouched unless cleanup is explicitly
  authorized.

## Diff Boundary

- Diff summaries stay metadata_only: branch name, worktree path, bounded changed
  path lists, and redacted numstat totals.
- The package does not render full handoff packets, raw diffs, raw provider
  payloads, or secret-bearing diagnostics.

## Release Surfaces

This phase updates `docs/worktree-leasing.md` and
`docs/coordination-backend.md` for the CS-2.2 coordination contract. CHANGELOG
and release-note surfaces stay unchanged because CS-2.2 is a non-dispatch
implementation PR.
