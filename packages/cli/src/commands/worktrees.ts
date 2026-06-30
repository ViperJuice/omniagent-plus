import { hostname } from "node:os";

import {
  cleanupLeasedWorktree,
  inspectWorktreeDirtyState,
  readGitBranch,
  WorktreeLeaseManager,
  type CleanupResult,
} from "@omniagent-plus/worktree-leasing";

import { createCliError } from "../errors.js";
import type {
  ParsedCliRequest,
  ParsedWorktreesCleanupRequest,
} from "../args.js";
import {
  worktreesCleanupResultSchema,
  worktreesListResultSchema,
} from "../types.js";

function summarizeLease(lease: Awaited<ReturnType<WorktreeLeaseManager["listActiveLeases"]>>[number]) {
  return {
    id: lease.id,
    repoId: lease.repoId,
    path: lease.path,
    branchName: lease.branchName,
    mode: lease.mode,
    dirtyState: lease.dirtyState,
    holderHost: lease.holder.host,
    holderProcessId: lease.holder.processId,
    sessionId: lease.holder.sessionId,
    turnId: lease.holder.turnId,
    acquiredAt: lease.acquiredAt,
    renewedAt: lease.renewedAt,
    expiresAt: lease.expiresAt,
  };
}

async function runWorktreesList(request: ParsedCliRequest) {
  const manager = await WorktreeLeaseManager.open({
    rootDir: request.stateRoot,
  });
  const leases = await manager.listActiveLeases();

  return worktreesListResultSchema.parse({
    schema: "cli.worktrees.list.result.v0.1",
    count: leases.length,
    leases: leases
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
      .map(summarizeLease),
  });
}

async function readBranchMatch(
  repoRoot: string | undefined,
  worktreePath: string,
  branchName: string,
): Promise<boolean | undefined> {
  if (repoRoot === undefined) {
    return undefined;
  }

  try {
    return (await readGitBranch(worktreePath)) === branchName;
  } catch {
    return undefined;
  }
}

function cleanupPayload(
  leaseId: string,
  result: CleanupResult,
) {
  return worktreesCleanupResultSchema.parse({
    schema: "cli.worktrees.cleanup.result.v0.1",
    leaseId,
    deleted: result.deleted,
    reason: result.reason,
    metadataOnlyEvidence: result.metadataOnlyEvidence,
  });
}

async function runWorktreesCleanup(
  request: ParsedWorktreesCleanupRequest,
) {
  const manager = await WorktreeLeaseManager.open({
    rootDir: request.stateRoot,
  });
  const stored = await manager.getStoredLeaseRecord(request.leaseId);

  if (stored === undefined) {
    throw createCliError("missing_record", `Worktree lease ${request.leaseId} was not found.`, {
      leaseId: request.leaseId,
    });
  }

  const dirtyState = await inspectWorktreeDirtyState(stored.lease.path);
  const result = await cleanupLeasedWorktree(manager, stored.lease, {
    activeFencingToken: stored.lease.fencingToken,
    currentHost: request.currentHost ?? hostname(),
    dirtyState,
    branchMatches: await readBranchMatch(
      stored.repoRoot,
      stored.lease.path,
      stored.lease.branchName,
    ),
    repoRoot: stored.repoRoot,
    worktreePath: stored.lease.path,
    allowReadOnlyCleanup: request.allowReadOnlyCleanup,
  });
  const payload = cleanupPayload(request.leaseId, result);

  if (!result.deleted) {
    throw createCliError("cleanup_block", `Worktree cleanup blocked: ${result.reason}.`, {
      result: payload,
    });
  }

  return payload;
}

export async function runWorktreesCommand(
  request: ParsedCliRequest,
) {
  switch (request.command) {
    case "worktrees list":
      return runWorktreesList(request);
    case "worktrees cleanup":
      return runWorktreesCleanup(request);
    default:
      throw createCliError("internal_failure", "worktrees command dispatch received an unexpected request.");
  }
}
