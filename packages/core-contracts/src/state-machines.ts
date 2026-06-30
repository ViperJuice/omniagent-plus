import type { RuntimeEvent } from "./events.js";
import { createRuntimeFailure, type RuntimeFailure } from "./errors.js";

export const agentSessionStates = [
  "created",
  "starting",
  "idle",
  "turn_active",
  "blocked_on_approval",
  "cancelling",
  "closed",
  "failed",
] as const;
export type AgentSessionState = (typeof agentSessionStates)[number];

export const turnStates = [
  "accepted",
  "queued",
  "running",
  "blocked_on_tool_approval",
  "cancelling",
  "cancelled",
  "timed_out",
  "completed",
  "failed",
] as const;
export type TurnState = (typeof turnStates)[number];

export const sessionTransitionTable: Record<
  AgentSessionState,
  readonly AgentSessionState[]
> = {
  created: ["starting", "failed"],
  starting: ["idle", "failed"],
  idle: ["turn_active", "cancelling", "closed", "failed"],
  turn_active: ["blocked_on_approval", "cancelling", "idle", "failed"],
  blocked_on_approval: ["turn_active", "cancelling", "idle", "failed"],
  cancelling: ["idle", "closed", "failed"],
  closed: [],
  failed: [],
};

export const turnTransitionTable: Record<TurnState, readonly TurnState[]> = {
  accepted: ["queued", "running", "failed", "cancelled"],
  queued: ["running", "cancelling", "timed_out", "failed", "cancelled"],
  running: [
    "blocked_on_tool_approval",
    "cancelling",
    "completed",
    "timed_out",
    "failed",
  ],
  blocked_on_tool_approval: ["running", "cancelling", "timed_out", "failed"],
  cancelling: ["cancelled", "failed"],
  cancelled: [],
  timed_out: [],
  completed: [],
  failed: [],
};

export function canTransitionSession(
  from: AgentSessionState,
  to: AgentSessionState,
): boolean {
  return sessionTransitionTable[from].includes(to);
}

export function canTransitionTurn(from: TurnState, to: TurnState): boolean {
  return turnTransitionTable[from].includes(to);
}

export function assertSessionTransition(
  from: AgentSessionState,
  to: AgentSessionState,
): void {
  if (!canTransitionSession(from, to)) {
    throw createRuntimeFailure({
      actor: "provider",
      category: "state_conflict",
      message: `Invalid session transition ${from} -> ${to}.`,
      retryable: false,
      scope: "session",
    });
  }
}

export function assertTurnTransition(from: TurnState, to: TurnState): void {
  if (!canTransitionTurn(from, to)) {
    throw createRuntimeFailure({
      actor: "provider",
      category: "state_conflict",
      message: `Invalid turn transition ${from} -> ${to}.`,
      retryable: false,
      scope: "turn",
    });
  }
}

export function applySessionTransition(
  from: AgentSessionState,
  to: AgentSessionState,
): AgentSessionState {
  assertSessionTransition(from, to);
  return to;
}

export function applyTurnTransition(from: TurnState, to: TurnState): TurnState {
  assertTurnTransition(from, to);
  return to;
}

export function reduceTurnState(events: RuntimeEvent[]): TurnState {
  let state: TurnState = "accepted";

  for (const event of events) {
    switch (event.type) {
      case "runtime.turn.started":
        if (state === "accepted" || state === "queued") {
          state = applyTurnTransition(state, "running");
        }
        break;
      case "runtime.approval.request":
        if (state === "running") {
          state = applyTurnTransition(state, "blocked_on_tool_approval");
        }
        break;
      case "runtime.turn.completed":
        return "completed";
      case "runtime.turn.failed":
        return "failed";
      case "runtime.turn.cancelled":
        if (state === "running" || state === "blocked_on_tool_approval") {
          state = applyTurnTransition(state, "cancelling");
        }
        return state === "cancelling"
          ? applyTurnTransition(state, "cancelled")
          : "cancelled";
      case "runtime.turn.timed_out":
        return "timed_out";
      case "runtime.heartbeat":
      case "runtime.limit":
      case "runtime.session.closed":
      case "runtime.session.created":
      case "runtime.text.delta":
      case "runtime.tool.call":
      case "runtime.tool.result":
        break;
      default:
        break;
    }
  }

  return state;
}

export function requireSingleTerminalEvent(events: RuntimeEvent[]): RuntimeFailure | null {
  const terminalEvents = events.filter(
    (event) =>
      event.type === "runtime.turn.completed" ||
      event.type === "runtime.turn.failed" ||
      event.type === "runtime.turn.cancelled" ||
      event.type === "runtime.turn.timed_out",
  );

  if (terminalEvents.length <= 1) {
    return null;
  }

  return createRuntimeFailure({
    actor: "provider",
    category: "protocol",
    message: "Multiple normalized terminal turn events were emitted.",
    retryable: false,
    scope: "turn",
  });
}
