import type {
  IdentityProfileStatus,
  LimitClassification,
  ProviderFamilyCooldown,
  WorktreeLease,
} from "@omniagent-plus/core-contracts";
import {
  buildActiveTurnSnapshot,
  buildIdentityPool,
  persistRouteDecision,
  planRoute,
} from "@omniagent-plus/coordinator";
import { listIdentityProfiles } from "@omniagent-plus/identity-isolation";
import { AuditLedger } from "@omniagent-plus/state-ledger";
import { WorktreeLeaseManager } from "@omniagent-plus/worktree-leasing";

import { createCliError } from "../errors.js";
import type { ParsedCliRequest } from "../args.js";
import { routeTaskResultSchema } from "../types.js";

function latestBySequence<T>(
  entries: readonly T[],
  getKey: (entry: T) => string | undefined,
  getSequence: (entry: T) => number,
): Map<string, T> {
  const latest = new Map<string, T>();

  for (const entry of entries) {
    const key = getKey(entry);
    if (key === undefined) {
      continue;
    }
    const previous = latest.get(key);
    if (previous === undefined || getSequence(entry) > getSequence(previous)) {
      latest.set(key, entry);
    }
  }

  return latest;
}

async function readWorktreeLease(
  stateRoot: string,
  leaseId: string | undefined,
): Promise<WorktreeLease | undefined> {
  if (leaseId === undefined) {
    return undefined;
  }

  const manager = await WorktreeLeaseManager.open({
    rootDir: stateRoot,
  });
  const stored = await manager.getStoredLeaseRecord(leaseId);
  if (stored === undefined) {
    throw createCliError("missing_record", `Worktree lease ${leaseId} was not found.`, {
      leaseId,
    });
  }
  return stored.lease;
}

export async function runRouteTaskCommand(
  request: ParsedCliRequest,
) {
  if (request.command !== "route-task") {
    throw new Error("route-task command dispatch received an unexpected request.");
  }

  const profiles = await listIdentityProfiles(request.profilesDir);
  if (profiles.length === 0) {
    throw createCliError("validation_failure", "No identity profiles were available for route-task.");
  }

  const ledger = await AuditLedger.open({
    rootDir: request.stateRoot,
  });
  const statusRecords = await ledger.listRecordsByKind("identity_profile_status");
  const cooldownRecords = await ledger.listRecordsByKind("provider_cooldown");
  const classificationRecords = await ledger.listRecordsByKind("limit_classification");
  const latestStatuses = [
    ...latestBySequence(
      statusRecords,
      (record) => (record.payload as IdentityProfileStatus).profileId,
      (record) => record.sequence,
    ).values(),
  ].map((record) => record.payload as IdentityProfileStatus);
  const latestCooldowns = [
    ...latestBySequence(
      cooldownRecords,
      (record) => (record.payload as ProviderFamilyCooldown).provider,
      (record) => record.sequence,
    ).values(),
  ].map((record) => record.payload as ProviderFamilyCooldown);
  const classificationByProviderEntries = [
    ...latestBySequence(
      classificationRecords,
      (record) => (record.payload as LimitClassification).provider,
      (record) => record.sequence,
    ).values(),
  ];
  const classificationByProvider = Object.fromEntries(
    classificationByProviderEntries.flatMap((record) => {
      const payload = record.payload as LimitClassification;
      return payload.provider === undefined ? [] : [[payload.provider, payload] as const];
    }),
  );
  const classificationTaskId = request.classificationTaskId ?? request.taskId;
  const latestClassification = [...classificationRecords]
    .filter((record) => record.taskId === classificationTaskId)
    .sort((left, right) => left.sequence - right.sequence)
    .at(-1)?.payload as LimitClassification | undefined
    ?? (
      request.preferredProvider === undefined
        ? undefined
        : classificationByProvider[request.preferredProvider]
    );
  const worktreeLease = await readWorktreeLease(
    request.stateRoot,
    request.worktreeLeaseId,
  );
  const identityPool = buildIdentityPool({
    profiles: profiles.map((entry) => entry.profile),
    statuses: latestStatuses,
    providerCooldowns: latestCooldowns,
    activeTurns: buildActiveTurnSnapshot(latestStatuses),
    classificationByProvider,
  });
  const planned = planRoute({
    taskId: request.taskId,
    identityPool,
    latestClassification,
    preferredProvider: request.preferredProvider as never,
    preferredHarness: request.preferredHarness as never,
    preferredIdentityProfileId: request.preferredIdentityProfileId,
    portabilityInput: {
      sessionContinuation: request.sessionContinuation,
      handoffEvidence: request.handoffEvidence,
      worktreeLease,
      rawHistoryAttached: request.rawHistoryAttached,
      localFilesystemDependency: request.localFilesystemDependency,
      allowCrossProviderMigration: request.allowCrossProviderMigration,
    },
    manualConfirmationProvided: request.manualConfirmationProvided,
    worktreeLease,
  });
  let routeDecision = planned.decision;
  let persistedRecord:
    | {
      readonly recordId: string;
      readonly sequence: number;
    }
    | undefined;
  let recordMode: "dry_run" | "recorded" = "dry_run";

  if (request.record) {
    routeDecision = await persistRouteDecision(ledger, routeDecision);
    recordMode = "recorded";
    const latestRouteRecord = (await ledger.listTaskRecords(request.taskId))
      .filter((record) => record.kind === "route_decision")
      .sort((left, right) => left.sequence - right.sequence)
      .at(-1);
    if (latestRouteRecord !== undefined) {
      persistedRecord = {
        recordId: latestRouteRecord.recordId,
        sequence: latestRouteRecord.sequence,
      };
    }
  }

  const selectedCandidate = identityPool.candidates.find(
    (candidate) => candidate.profile.id === routeDecision.selectedIdentityProfileId,
  );
  if (selectedCandidate === undefined) {
    throw createCliError("validation_failure", "Route planner did not return a candidate present in the identity pool.");
  }

  const result = routeTaskResultSchema.parse({
    schema: "cli.route-task.result.v0.1",
    recordMode,
    candidate: {
      profileId: selectedCandidate.profile.id,
      provider: selectedCandidate.profile.provider,
      harness: selectedCandidate.profile.harness,
      available: selectedCandidate.available,
      currentCapacity: selectedCandidate.currentCapacity,
      reasons: [...selectedCandidate.reasons],
    },
    portability: planned.portability,
    routeDecision,
    persistedRecord,
  });

  if (routeDecision.launchGate?.action !== "allowed") {
    throw createCliError(
      "route_block",
      `Route blocked: ${routeDecision.launchGate?.reason ?? "launch gate did not allow execution"}.`,
      {
        result,
      },
    );
  }

  return result;
}
