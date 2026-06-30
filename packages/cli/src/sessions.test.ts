import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { AuditLedger } from "@omniagent-plus/state-ledger";

import { COMMAND_REGISTRY } from "./command-registry.js";
import { executeCli } from "./runtime.js";

function readFixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(
      new URL(`../../../fixtures/cli/sessions/${name}`, import.meta.url),
      "utf8",
    ),
  ) as T;
}

async function seedLedger(rootDir: string): Promise<void> {
  const ledger = await AuditLedger.open({
    rootDir,
  });

  await ledger.appendSession({
    id: "session-cli",
    runtime: "omnigent",
    targetHarness: "codex",
    targetProvider: "openai",
    identityProfileId: "profile-codex-dev",
    title: "CLI Session",
    state: "idle",
    createdAt: "2026-06-30T00:00:00.000Z",
    updatedAt: "2026-06-30T00:00:00.000Z",
  });
  await ledger.appendTurn({
    sessionId: "session-cli",
    turnId: "turn-cli-1",
    idempotencyKey: "turn-cli-1",
    state: "completed",
    createdAt: "2026-06-30T00:00:01.000Z",
    updatedAt: "2026-06-30T00:00:02.000Z",
    eventCursor: 1,
  });
  await ledger.appendRuntimeEvent({
    schema: "runtime_event.v0.1",
    eventId: "event-cli-1",
    sequence: 1,
    sessionId: "session-cli",
    turnId: "turn-cli-1",
    type: "runtime.turn.completed",
    occurredAt: "2026-06-30T00:00:02.000Z",
    payload: {
      outcome: "completed",
      outputSummary: "ok",
    },
    redaction: "metadata_only",
    terminal: true,
  });
  await ledger.appendApprovalRequest({
    approvalRequestId: "approval-cli-1",
    sessionId: "session-cli",
    turnId: "turn-cli-1",
    requestedAction: "run cleanup",
    risk: "low",
    allowedApprovers: ["operator"],
  });
  await ledger.appendApprovalResponse(
    {
      approvalRequestId: "approval-cli-1",
      decision: "approved",
      decidedAt: "2026-06-30T00:00:03.000Z",
      decidedBy: "operator",
    },
    {
      sessionId: "session-cli",
      turnId: "turn-cli-1",
    },
  );
  await ledger.appendEvidenceRef(
    {
      kind: "test",
      label: "cli-session-evidence",
      path: "fixtures/cli/sessions/session-show.json",
    },
    {
      sessionId: "session-cli",
      turnId: "turn-cli-1",
    },
  );
}

describe("session commands", () => {
  it("lists durable sessions without raw transcript output", async () => {
    const fixture = readFixture<{
      count: number;
      sessions: Array<{
        id: string;
        title: string;
        state: string;
        turnCount: number;
        eventCount: number;
        approvalRequestCount: number;
        approvalResponseCount: number;
        evidenceRefCount: number;
      }>;
    }>("session-list.json");
    const stateRoot = await mkdtemp(join(tmpdir(), "cli-sessions-list-"));
    await seedLedger(stateRoot);

    const result = await executeCli(
      ["sessions", "list", "--state-root", stateRoot, "--json"],
      COMMAND_REGISTRY,
    );
    const parsed = JSON.parse(result.stdout) as {
      readonly result: {
        readonly count: number;
        readonly sessions: Array<Record<string, unknown>>;
      };
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.result.count).toBe(fixture.count);
    expect(parsed.result.sessions[0]).toEqual(
      expect.objectContaining(fixture.sessions[0]),
    );
  });

  it("shows one durable session summary with deterministic event metadata", async () => {
    const fixture = readFixture<{
      session: {
        id: string;
        title: string;
        state: string;
      };
      history: {
        eventCount: number;
        eventType: string;
      };
      turns: Array<{
        turnId: string;
        state: string;
      }>;
    }>("session-show.json");
    const stateRoot = await mkdtemp(join(tmpdir(), "cli-sessions-show-"));
    await seedLedger(stateRoot);

    const result = await executeCli(
      [
        "sessions",
        "show",
        "--session-id",
        "session-cli",
        "--state-root",
        stateRoot,
        "--json",
      ],
      COMMAND_REGISTRY,
    );
    const parsed = JSON.parse(result.stdout) as {
      readonly result: {
        readonly session: Record<string, unknown>;
        readonly turns: Array<Record<string, unknown>>;
        readonly history: {
          readonly eventCount: number;
          readonly events: Array<{ readonly type: string }>;
        };
      };
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.result.session).toEqual(
      expect.objectContaining(fixture.session),
    );
    expect(parsed.result.turns[0]).toEqual(
      expect.objectContaining(fixture.turns[0]),
    );
    expect(parsed.result.history.eventCount).toBe(fixture.history.eventCount);
    expect(parsed.result.history.events[0]?.type).toBe(fixture.history.eventType);
  });
});
