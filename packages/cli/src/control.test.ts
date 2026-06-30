import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildHandoffPacket } from "@omniagent-plus/core-contracts";
import { AuditLedger, getStateLedgerPaths } from "@omniagent-plus/state-ledger";

import { COMMAND_REGISTRY } from "./command-registry.js";
import { executeCli } from "./runtime.js";

function readFixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(
      new URL(`../../../fixtures/cli/control/${name}`, import.meta.url),
      "utf8",
    ),
  ) as T;
}

async function seedUiStateRoot(stateRoot: string): Promise<void> {
  const ledger = await AuditLedger.open({ rootDir: stateRoot });
  const handoff = buildHandoffPacket({
    packetId: "packet-1",
    createdAt: "2026-06-30T00:08:00.000Z",
    sourceSessionIds: ["session-parent"],
    sourceHarnesses: ["codex"],
    targetHarness: "claude-code",
    targetProvider: "openai",
    reason: "session_continuation",
    objective: "Continue the child control read-model review.",
    currentStatus: "in_progress",
    workspace: {
      branch: "feature/ui",
      worktreePath: "/mnt/workspace/worktrees/omniagent-plus-feature-ui",
    },
    evidence: {
      changedFiles: ["docs/ui-read-model.md"],
      inspectedFiles: ["packages/state-ledger/src/replay.ts"],
      commandsRun: [
        {
          command: "pnpm --filter @omniagent-plus/cli test -- --run packages/cli/src/control.test.ts",
          exitCode: 0,
          summary: "CLI control snapshot test passed.",
        },
      ],
      testResults: [
        {
          name: "control snapshot",
          status: "passed",
          summary: "Read-only snapshot output matched the fixture.",
        },
      ],
    },
    risks: ["Keep the control snapshot command read-only."],
    openQuestions: ["Should the browser UI paginate long audit feeds?"],
    nextRecommendedAction: "Confirm the read-only CLI snapshot output.",
    contextPolicy: {
      rawHistoryAllowed: false,
      mayEditFiles: true,
      mayRunCommands: true,
      mayUseNetwork: false,
      maySwitchProvider: false,
    },
  });

  await ledger.appendSession({
    id: "session-parent",
    runtime: "omnigent",
    targetHarness: "codex",
    targetProvider: "openai",
    identityProfileId: "profile-openai-primary",
    title: "Control snapshot parent",
    state: "blocked_on_approval",
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:06:00.000Z",
    worktree: {
      id: "lease-1",
      path: "/mnt/workspace/worktrees/omniagent-plus-feature-ui",
      branchName: "feature/ui",
      mode: "exclusive_write",
    },
  });
  await ledger.appendTurn({
    sessionId: "session-parent",
    turnId: "turn-parent-1",
    idempotencyKey: "turn-parent-1",
    state: "blocked_on_tool_approval",
    createdAt: "2026-06-30T00:01:00.000Z",
    updatedAt: "2026-06-30T00:03:00.000Z",
    eventCursor: 2,
  });
  await ledger.appendRuntimeEvent({
    schema: "runtime_event.v0.1",
    eventId: "event-parent-1",
    sequence: 1,
    sessionId: "session-parent",
    turnId: "turn-parent-1",
    type: "runtime.turn.started",
    occurredAt: "2026-06-30T00:02:00.000Z",
    payload: {
      message: "Review the UI read model",
      state: "running",
    },
    redaction: "metadata_only",
    terminal: false,
  });
  await ledger.appendApprovalRequest({
    approvalRequestId: "approval-1",
    toolCallId: "tool-1",
    sessionId: "session-parent",
    turnId: "turn-parent-1",
    requestedAction: "review control snapshot docs",
    risk: "medium",
    allowedApprovers: ["operator"],
  });
  await ledger.appendRuntimeEvent({
    schema: "runtime_event.v0.1",
    eventId: "event-parent-2",
    sequence: 2,
    sessionId: "session-parent",
    turnId: "turn-parent-1",
    type: "runtime.approval.request",
    occurredAt: "2026-06-30T00:03:00.000Z",
    payload: {
      request: {
        approvalRequestId: "approval-1",
        toolCallId: "tool-1",
        sessionId: "session-parent",
        turnId: "turn-parent-1",
        requestedAction: "review control snapshot docs",
        risk: "medium",
        allowedApprovers: ["operator"],
      },
    },
    redaction: "metadata_only",
    terminal: false,
  });
  await ledger.appendRouteDecision({
    schema: "route_decision.v0.1",
    taskId: "task-parent",
    selectedProvider: "openai",
    selectedHarness: "codex",
    selectedIdentityProfileId: "profile-openai-primary",
    preferredProvider: "openai",
    preferredHarness: "codex",
    fallbackUsed: false,
    capabilityFit: 1,
    providerHealth: 0.95,
    currentCapacity: 0.45,
    contextPortability: "high",
    portabilityScore: 0.88,
    activeTurnTarget: 2,
    routeReason: "capability_fit",
    silentDowngrade: false,
  });
  await ledger.appendProviderCooldown({
    schema: "provider_family_cooldown.v0.1",
    provider: "openai",
    scope: "provider_family",
    active: true,
    reason: "rate limit",
    observedAt: "2026-06-30T00:05:00.000Z",
    resetAt: "2026-06-30T00:10:00.000Z",
    source: "limit_classification",
  });
  await ledger.appendWorktreeLease({
    id: "lease-1",
    fencingToken: "token-1",
    repoId: "ViperJuice/omniagent-plus",
    path: "/mnt/workspace/worktrees/omniagent-plus-feature-ui",
    branchName: "feature/ui",
    mode: "exclusive_write",
    holder: {
      processId: 4242,
      host: "display",
      sessionId: "session-parent",
      turnId: "turn-parent-1",
    },
    acquiredAt: "2026-06-30T00:05:00.000Z",
    renewedAt: "2026-06-30T00:05:30.000Z",
    expiresAt: "2026-06-30T00:15:30.000Z",
    dirtyState: "clean",
  });
  await ledger.appendLimitClassification({
    schema: "limit_classification.v0.1",
    type: "burst_rate_limit",
    scope: "provider_family",
    confidence: 0.99,
    provider: "openai",
    harness: "codex",
    identityProfileId: "profile-openai-primary",
    sessionId: "session-parent",
    retryAfterSeconds: 300,
    resetAt: "2026-06-30T00:10:00.000Z",
    rawSignal: {
      statusCode: 429,
    },
    routingAction: {
      retrySameSession: false,
      reduceConcurrency: true,
      routeNewWorkElsewhere: true,
      migrateExistingPortableWork: true,
      requireManualReview: false,
      sameProviderAccountSwitch: "forbidden",
    },
  });
  await ledger.appendEvidenceRef(
    {
      kind: "log",
      label: "phase verification",
      path: ".phase-loop/runs/ui/verification.log",
      excerpt: "Redacted verification summary only.",
    },
    {
      sessionId: "session-parent",
      turnId: "turn-parent-1",
      taskId: "task-parent",
    },
  );
  await ledger.appendSession({
    id: "session-child",
    runtime: "omnigent",
    targetHarness: "codex",
    targetProvider: "openai",
    title: "Control snapshot child",
    state: "idle",
    createdAt: "2026-06-30T00:04:00.000Z",
    updatedAt: "2026-06-30T00:09:00.000Z",
    parentSessionId: "session-parent",
    rootSessionId: "session-parent",
    handoffPacket: handoff,
  });
}

describe("control snapshot command", () => {
  it("returns the API-ready UI snapshot without mutating durable state", async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), "cli-control-"));
    await seedUiStateRoot(stateRoot);
    const ledgerPath = getStateLedgerPaths(stateRoot).ledgerPath;
    const before = await readFile(ledgerPath, "utf8");
    const fixture = readFixture<Record<string, unknown>>("snapshot.json");

    const result = await executeCli(
      ["control", "snapshot", "--state-root", stateRoot, "--json"],
      COMMAND_REGISTRY,
    );
    const parsed = JSON.parse(result.stdout) as {
      readonly result: Record<string, unknown>;
    };
    const after = await readFile(ledgerPath, "utf8");

    expect(result.exitCode).toBe(0);
    expect(parsed.result).toMatchObject(fixture);
    expect(after).toBe(before);
  });

  it("returns an empty read-only snapshot when the state root does not exist", async () => {
    const rootDir = await mkdtemp(join(tmpdir(), "cli-control-missing-"));
    const missingStateRoot = join(rootDir, "missing-state");

    const result = await executeCli(
      ["control", "snapshot", "--state-root", missingStateRoot, "--json"],
      COMMAND_REGISTRY,
    );
    const parsed = JSON.parse(result.stdout) as {
      readonly result: {
        readonly stateStorePresent: boolean;
        readonly readOnly: boolean;
        readonly snapshot: {
          readonly sessions: unknown[];
          readonly routeDecisions: unknown[];
          readonly approvals: unknown[];
        };
      };
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.result.readOnly).toBe(true);
    expect(parsed.result.stateStorePresent).toBe(false);
    expect(parsed.result.snapshot.sessions).toEqual([]);
    expect(parsed.result.snapshot.routeDecisions).toEqual([]);
    expect(parsed.result.snapshot.approvals).toEqual([]);
    expect(existsSync(missingStateRoot)).toBe(false);
  });
});
