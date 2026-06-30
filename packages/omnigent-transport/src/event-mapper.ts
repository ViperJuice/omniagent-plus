import {
  createRuntimeEvent,
  createRuntimeFailure,
  type RuntimeEvent,
} from "@omniagent-plus/core-contracts";

import type { OmnigentRawEvent } from "./types.js";

function sessionCreatedState(rawEvent: OmnigentRawEvent): "created" | "starting" | "idle" | "failed" {
  if (rawEvent.type === "session.created") {
    return "created";
  }

  if (rawEvent.status === "failed") {
    return "failed";
  }

  if (rawEvent.status === "running") {
    return "starting";
  }

  return "idle";
}

function defaultTurnMessage(rawEvent: OmnigentRawEvent): string {
  return rawEvent.message ?? `Omnigent turn ${rawEvent.turnId ?? "unknown"}`;
}

export interface OmnigentEventMapperOptions {
  readonly seenItemIds?: Iterable<string>;
  readonly startingSequence?: number;
}

export class OmnigentEventMapper {
  readonly seenItemIds: Set<string>;

  private emittedSessionCreated = false;
  private readonly emittedStartedTurnIds = new Set<string>();
  private readonly emittedTerminalTurnIds = new Set<string>();
  private nextSequence: number;

  constructor(
    private readonly sessionId: string,
    options: OmnigentEventMapperOptions = {},
  ) {
    this.seenItemIds = new Set(options.seenItemIds ?? []);
    this.nextSequence = options.startingSequence ?? 1;
  }

  map(rawEvent: OmnigentRawEvent): RuntimeEvent[] {
    const itemKey = rawEvent.itemId ?? rawEvent.id;
    if (itemKey && this.seenItemIds.has(itemKey)) {
      return [];
    }

    if (itemKey) {
      this.seenItemIds.add(itemKey);
    }

    switch (rawEvent.type) {
      case "session.created":
        if (this.emittedSessionCreated) {
          return [];
        }
        this.emittedSessionCreated = true;
        return [
          this.createEvent({
            eventId: rawEvent.id,
            occurredAt: rawEvent.occurredAt,
            payload: {
              state: sessionCreatedState(rawEvent),
              title: rawEvent.message ?? "Omnigent session",
            },
            terminal: false,
            type: "runtime.session.created",
          }),
        ];
      case "turn.started":
      case "response.created":
        if (!rawEvent.turnId || this.emittedStartedTurnIds.has(rawEvent.turnId)) {
          return [];
        }
        this.emittedStartedTurnIds.add(rawEvent.turnId);
        return [
          this.createEvent({
            eventId: rawEvent.id,
            occurredAt: rawEvent.occurredAt,
            payload: {
              message: defaultTurnMessage(rawEvent),
              state: "running",
            },
            terminal: false,
            turnId: rawEvent.turnId,
            type: "runtime.turn.started",
          }),
        ];
      case "response.output_text.delta":
        return [
          this.createEvent({
            eventId: rawEvent.id,
            occurredAt: rawEvent.occurredAt,
            payload: {
              delta: rawEvent.delta ?? "",
            },
            terminal: false,
            turnId: rawEvent.turnId,
            type: "runtime.text.delta",
          }),
        ];
      case "response.completed":
      case "turn.completed":
        return this.mapTerminalEvent(rawEvent, "runtime.turn.completed");
      case "response.cancelled":
      case "turn.cancelled":
        return this.mapTerminalEvent(rawEvent, "runtime.turn.cancelled");
      case "response.incomplete":
        if (rawEvent.reason?.includes("interrupt")) {
          return this.mapTerminalEvent(rawEvent, "runtime.turn.cancelled");
        }
        if (rawEvent.reason?.includes("timeout")) {
          return this.mapTerminalEvent(rawEvent, "runtime.turn.timed_out");
        }
        return this.mapFailedEvent(rawEvent);
      case "response.failed":
      case "turn.failed":
        return this.mapFailedEvent(rawEvent);
      case "session.status":
      case "session.input.consumed":
      case "session.interrupted":
      case "session.child_session.updated":
      case "response.queued":
      case "response.in_progress":
      case "[DONE]":
        return [];
      default:
        return [];
    }
  }

  private mapFailedEvent(rawEvent: OmnigentRawEvent): RuntimeEvent[] {
    if (!rawEvent.turnId || this.emittedTerminalTurnIds.has(rawEvent.turnId)) {
      return [];
    }
    this.emittedTerminalTurnIds.add(rawEvent.turnId);

    return [
      this.createEvent({
        eventId: rawEvent.id,
        occurredAt: rawEvent.occurredAt,
        payload: {
          failure: createRuntimeFailure({
            actor: "omnigent",
            category: rawEvent.failure?.category ?? "backend_unavailable",
            message:
              rawEvent.failure?.message ??
              rawEvent.reason ??
              "Omnigent reported a terminal failure.",
            resetAt: rawEvent.failure?.resetAt,
            retryAfterSeconds: rawEvent.failure?.retryAfterSeconds,
            retryable:
              (rawEvent.failure?.category ?? "backend_unavailable") !==
              "backend_capability_missing",
            safeDiagnostics:
              rawEvent.failure?.statusCode === undefined
                ? undefined
                : { statusCode: rawEvent.failure.statusCode },
            scope: "turn",
          }),
          outcome: "failed",
        },
        terminal: true,
        turnId: rawEvent.turnId,
        type: "runtime.turn.failed",
      }),
    ];
  }

  private mapTerminalEvent(
    rawEvent: OmnigentRawEvent,
    type:
      | "runtime.turn.completed"
      | "runtime.turn.cancelled"
      | "runtime.turn.timed_out",
  ): RuntimeEvent[] {
    if (!rawEvent.turnId || this.emittedTerminalTurnIds.has(rawEvent.turnId)) {
      return [];
    }
    this.emittedTerminalTurnIds.add(rawEvent.turnId);

    if (type === "runtime.turn.completed") {
      return [
        this.createEvent({
          eventId: rawEvent.id,
          occurredAt: rawEvent.occurredAt,
          payload: {
            outcome: "completed",
            outputSummary: rawEvent.outputText,
          },
          terminal: true,
          turnId: rawEvent.turnId,
          type,
        }),
      ];
    }

    if (type === "runtime.turn.cancelled") {
      return [
        this.createEvent({
          eventId: rawEvent.id,
          occurredAt: rawEvent.occurredAt,
          payload: {
            outcome: "cancelled",
            reason: rawEvent.reason,
          },
          terminal: true,
          turnId: rawEvent.turnId,
          type,
        }),
      ];
    }

    return [
      this.createEvent({
        eventId: rawEvent.id,
        occurredAt: rawEvent.occurredAt,
        payload: {
          outcome: "timed_out",
        },
        terminal: true,
        turnId: rawEvent.turnId,
        type,
      }),
    ];
  }

  private createEvent<TType extends RuntimeEvent["type"]>(
    event: {
      eventId: string;
      occurredAt: string;
      payload: Extract<RuntimeEvent, { type: TType }>["payload"];
      sessionId?: string;
      terminal: boolean;
      turnId?: string;
      type: TType;
    },
  ): Extract<RuntimeEvent, { type: TType }> {
    const runtimeEvent = {
      ...event,
      redaction: "metadata_only",
      sequence: this.nextSequence,
      sessionId: event.sessionId ?? this.sessionId,
    } as unknown as Extract<RuntimeEvent, { type: TType }> & {
      sequence: number;
    };
    const created = createRuntimeEvent(runtimeEvent);
    this.nextSequence += 1;
    return created as Extract<RuntimeEvent, { type: TType }>;
  }
}

export function mapOmnigentEventSequence(
  sessionId: string,
  rawEvents: readonly OmnigentRawEvent[],
  options: OmnigentEventMapperOptions = {},
): RuntimeEvent[] {
  const mapper = new OmnigentEventMapper(sessionId, options);
  return rawEvents.flatMap((rawEvent) => mapper.map(rawEvent));
}
