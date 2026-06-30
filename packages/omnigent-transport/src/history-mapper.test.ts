import { describe, expect, it } from "vitest";

import { loadOmnigentEventFixture } from "./contract-fixtures.js";
import { mapOmnigentHistory } from "./history-mapper.js";
import type { OmnigentHistoryItem, OmnigentRawEvent } from "./types.js";

function historyFromFixture(fixtureName: string): OmnigentHistoryItem[] {
  const fixture = loadOmnigentEventFixture(fixtureName);
  return (fixture.events ?? [])
    .filter((event) => event.type !== "[DONE]")
    .map((event, index) => ({
      event: {
        delta:
          event.type === "response.output_text.delta" ? "history output" : undefined,
        id: `${fixtureName}-${index + 1}`,
        itemId: `${fixtureName}-${index + 1}`,
        message: event.type === "response.created" ? "history input" : undefined,
        occurredAt: new Date(
          Date.parse("2026-06-30T00:00:00.000Z") + index * 1000,
        ).toISOString(),
        outputText:
          event.type === "response.completed" ? "history output" : undefined,
        reason: event.reason,
        sessionId: "session-history",
        status:
          event.status === undefined
            ? undefined
            : (event.status as OmnigentRawEvent["status"]),
        turnId:
          event.type.startsWith("response.") || event.type.startsWith("turn.")
            ? "turn-history"
            : undefined,
        type: event.type as OmnigentRawEvent["type"],
      },
      id: `${fixtureName}-${index + 1}`,
    }));
}

describe("history mapper", () => {
  it("maps history items into replayable runtime events", () => {
    const mapped = mapOmnigentHistory(
      "session-history",
      historyFromFixture("normal-terminal"),
    );

    expect(mapped.history.events.some((event) => event.type === "runtime.turn.started")).toBe(
      true,
    );
    expect(mapped.history.nextCursor).toBeGreaterThan(0);
  });

  it("dedupes snapshot items by item id during reconnect", () => {
    const history = historyFromFixture("normal-terminal");
    const duplicated = [...history, history[1] ?? history[0]!];
    const mapped = mapOmnigentHistory("session-history", duplicated);

    expect(mapped.runtimeEvents.filter((event) => event.type === "runtime.text.delta")).toHaveLength(
      1,
    );
  });
});
