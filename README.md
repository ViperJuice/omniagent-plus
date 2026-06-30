# omniagent-plus

BOOTCORE establishes the TypeScript workspace and the runtime-neutral
`@omniagent-plus/core-contracts` package for `agent-runtime-provider-omnigent`.
This phase produces `IF-0-BOOTCORE-2` by freezing package boundaries, schema
exports, lifecycle tables, and fake-provider behavior without a real Omnigent
dependency.

## Workspace Surface

- `packages/core-contracts` exports the public contracts, validation schemas,
  lifecycle helpers, and fake provider used by downstream phases.
- `fixtures/core/` carries metadata-only fixtures derived from
  `IF-0-CONTRACT-1`.
- `docs/lifecycle-and-events.md` and `docs/architecture.md` explain the package
  boundary and what later phases still own.

## Verification

Run the BOOTCORE suite from the repo root:

```bash
pnpm install --frozen-lockfile
pnpm build
pnpm lint
pnpm typecheck
pnpm test -- --run
```

The verification gate also checks that `packages/core-contracts` has no real
Omnigent dependency and that the roadmap still validates after the phase.
