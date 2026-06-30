import { readFileSync } from "node:fs";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import {
  ensureGitWorktree,
  resolveMountedWorkspacePlacement,
  WorktreeLeaseManager,
} from "@omniagent-plus/worktree-leasing";
import { AuditLedger } from "@omniagent-plus/state-ledger";

import { COMMAND_REGISTRY } from "./command-registry.js";
import { executeCli } from "./runtime.js";

const profilesDir = new URL("../../../fixtures/identity/profiles", import.meta.url).pathname;

function runGit(cwd: string, args: readonly string[]): void {
  const result = spawnSync("git", [...args], {
    cwd,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(" ")} failed`);
  }
}

async function createRepo(rootDir: string): Promise<string> {
  const repoRoot = join(rootDir, "repo");
  await mkdir(repoRoot, { recursive: true });
  runGit(repoRoot, ["init", "--initial-branch=main"]);
  runGit(repoRoot, ["config", "user.name", "CLI Route Test"]);
  runGit(repoRoot, ["config", "user.email", "cli-route@example.com"]);
  await writeFile(join(repoRoot, "README.md"), "hello\n", "utf8");
  runGit(repoRoot, ["add", "README.md"]);
  runGit(repoRoot, ["commit", "-m", "init"]);
  return repoRoot;
}

function readFixture<T>(): T {
  return JSON.parse(
    readFileSync(
      new URL("../../../fixtures/cli/route-task/route-decision.json", import.meta.url),
      "utf8",
    ),
  ) as T;
}

describe("route-task", () => {
  it("records high-portability fallback route decisions without provider launch", async () => {
    const fixture = readFixture<{
      recordMode: string;
      selectedProvider: string;
      selectedIdentityProfileId: string;
      launchGateAction: string;
    }>();
    const rootDir = await mkdtemp(join(tmpdir(), "cli-route-task-"));
    const repoRoot = await createRepo(rootDir);
    const placement = await resolveMountedWorkspacePlacement({
      projectName: "omniagent-plus",
      branchName: "feature/route",
      repoRoot,
      fallbackRoot: join(rootDir, "worktrees"),
      workspaceMountExists: false,
    });
    const worktree = await ensureGitWorktree({
      repoRoot,
      targetPath: placement.path,
      branchName: "feature/route",
      baseRef: "HEAD",
    });
    const stateRoot = join(rootDir, "ledger");
    const manager = await WorktreeLeaseManager.open({
      rootDir: stateRoot,
    });
    const lease = await manager.acquireLease(
      {
        repoId: "omniagent-plus",
        repoRoot,
        baseRef: "main",
        branchName: "feature/route",
        taskId: "task-route-1",
        mode: "exclusive_write",
        requestedTtlSeconds: 120,
      },
      {
        holder: {
          processId: 999999,
          host: "display",
        },
        leasePath: worktree.path,
        dirtyState: "clean",
        now: "2026-06-30T00:00:00.000Z",
      },
    );
    const ledger = await AuditLedger.open({
      rootDir: stateRoot,
    });
    await ledger.appendLimitClassification(
      {
        schema: "limit_classification.v0.1",
        type: "fixed_window_usage_cap",
        scope: "provider_family",
        confidence: 0.96,
        provider: "openai",
        harness: "codex",
        retryAfterSeconds: 120,
        resetAt: "2026-07-01T00:00:00.000Z",
        rawSignal: {
          statusCode: 429,
          stderrExcerpt: "quota exceeded until reset",
        },
        routingAction: {
          retrySameSession: false,
          reduceConcurrency: true,
          routeNewWorkElsewhere: true,
          migrateExistingPortableWork: true,
          requireManualReview: false,
          sameProviderAccountSwitch: "forbidden",
        },
        notes: ["Prefer cross-provider fallback for portable work."],
      },
      {
        taskId: "task-route-1",
      },
    );

    const result = await executeCli(
      [
        "route-task",
        "--task-id",
        "task-route-1",
        "--preferred-provider",
        "openai",
        "--preferred-harness",
        "codex",
        "--preferred-identity-profile-id",
        "profile-openai-prod-cooldown",
        "--handoff-evidence",
        "--allow-cross-provider-migration",
        "--worktree-lease-id",
        lease.lease!.id,
        "--record",
        "--state-root",
        stateRoot,
        "--profiles-dir",
        profilesDir,
        "--json",
      ],
      COMMAND_REGISTRY,
    );
    const parsed = JSON.parse(result.stdout) as {
      readonly result: {
        readonly recordMode: string;
        readonly routeDecision: {
          readonly selectedProvider: string;
          readonly selectedIdentityProfileId?: string;
          readonly launchGate?: {
            readonly action: string;
          };
        };
        readonly persistedRecord?: {
          readonly recordId: string;
        };
      };
    };
    const persistedLedger = await AuditLedger.open({
      rootDir: stateRoot,
    });
    const taskRecords = await persistedLedger.listTaskRecords("task-route-1");

    expect(result.exitCode).toBe(0);
    expect(parsed.result.recordMode).toBe(fixture.recordMode);
    expect(parsed.result.routeDecision.selectedProvider).toBe(fixture.selectedProvider);
    expect(parsed.result.routeDecision.selectedIdentityProfileId).toBe(
      fixture.selectedIdentityProfileId,
    );
    expect(parsed.result.routeDecision.launchGate?.action).toBe(
      fixture.launchGateAction,
    );
    expect(parsed.result.persistedRecord?.recordId.length).toBeGreaterThan(0);
    expect(taskRecords.filter((record) => record.kind === "route_decision")).toHaveLength(1);
  });
});
