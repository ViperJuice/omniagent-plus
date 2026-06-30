import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  canTransitionSession,
  canTransitionTurn,
  reduceTurnState,
  sessionTransitionTable,
  turnTransitionTable,
} from "./state-machines.js";
import { createRuntimeEvent } from "./events.js";
import { getProtocolFailure } from "./fake-event-stream.js";

function readLifecycleFixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(
      new URL(`../../../fixtures/core/lifecycle/${name}`, import.meta.url),
      "utf8",
    ),
  ) as T;
}

describe("state machines", () => {
  it("matches the documented session and turn transition tables", () => {
    const fixture = readLifecycleFixture<{
      sessionTransitions: typeof sessionTransitionTable;
      turnTransitions: typeof turnTransitionTable;
    }>("transition-tables.json");

    expect(sessionTransitionTable).toEqual(fixture.sessionTransitions);
    expect(turnTransitionTable).toEqual(fixture.turnTransitions);
  });

  it("accepts the allowed lifecycle edges and rejects illegal ones", () => {
    expect(canTransitionSession("idle", "closed")).toBe(true);
    expect(canTransitionSession("closed", "turn_active")).toBe(false);
    expect(canTransitionTurn("running", "blocked_on_tool_approval")).toBe(true);
    expect(canTransitionTurn("completed", "running")).toBe(false);
  });

  it("keeps heartbeats from advancing turn state while honoring approval and terminal events", () => {
    const events = [
      createRuntimeEvent({
        eventId: "turn-started",
        occurredAt: "2026-06-30T00:00:00.000Z",
        payload: {
          message: "Ship BOOTCORE.",
          state: "running",
        },
        redaction: "metadata_only",
        sessionId: "session-1",
        sequence: 1,
        terminal: false,
        turnId: "turn-1",
        type: "runtime.turn.started",
      }),
      createRuntimeEvent({
        eventId: "turn-heartbeat",
        occurredAt: "2026-06-30T00:00:01.000Z",
        payload: {
          cursor: 2,
        },
        redaction: "metadata_only",
        sessionId: "session-1",
        sequence: 2,
        terminal: false,
        turnId: "turn-1",
        type: "runtime.heartbeat",
      }),
      createRuntimeEvent({
        eventId: "turn-approval",
        occurredAt: "2026-06-30T00:00:02.000Z",
        payload: {
          request: {
            approvalRequestId: "approval-1",
            allowedApprovers: ["operator"],
            requestedAction: "apply_patch",
            risk: "medium",
            sessionId: "session-1",
            turnId: "turn-1",
          },
        },
        redaction: "metadata_only",
        sessionId: "session-1",
        sequence: 3,
        terminal: false,
        turnId: "turn-1",
        type: "runtime.approval.request",
      }),
      createRuntimeEvent({
        eventId: "turn-completed",
        occurredAt: "2026-06-30T00:00:03.000Z",
        payload: {
          outcome: "completed",
        },
        redaction: "metadata_only",
        sessionId: "session-1",
        sequence: 4,
        terminal: true,
        turnId: "turn-1",
        type: "runtime.turn.completed",
      }),
    ];

    expect(reduceTurnState(events)).toBe("completed");
    expect(getProtocolFailure(null)).toBeNull();
  });
});
