import { describe, expect, it } from "vitest";

import {
  omnigentCapabilityStatuses,
  omnigentProviderModes,
  omnigentSessionStatuses,
  omnigentStreamEventTypes,
  type OmnigentHttpClientOptions,
  type OmnigentRawEvent,
  type OmnigentSessionSnapshot,
} from "./types.js";

describe("transport types", () => {
  it("freezes the provider modes, capability states, and stream events", () => {
    const httpOptions: OmnigentHttpClientOptions = {
      baseUrl: "http://127.0.0.1:4010",
    };
    const rawEvent: OmnigentRawEvent = {
      id: "item-1",
      type: "response.output_text.delta",
      sessionId: "session-1",
      occurredAt: "2026-06-30T00:00:00.000Z",
      delta: "hello",
      itemId: "item-1",
    };
    const snapshot: OmnigentSessionSnapshot = {
      id: "session-1",
      title: "transport test",
      status: "idle",
      createdAt: "2026-06-30T00:00:00.000Z",
      updatedAt: "2026-06-30T00:00:00.000Z",
      backend: "omnigent-http",
      background_task_count: 1,
      items: [{ id: "item-1", event: rawEvent }],
      viewer_last_seen: 1_780_000_000,
      viewer_unread: false,
    };

    expect(httpOptions.baseUrl).toContain("127.0.0.1");
    expect(omnigentProviderModes).toEqual(["http", "cli", "hybrid"]);
    expect(omnigentCapabilityStatuses).toContain("emulated");
    expect(omnigentSessionStatuses).toContain("waiting");
    expect(omnigentSessionStatuses).toContain("launching");
    expect(omnigentStreamEventTypes).toContain("response.output_text.delta");
    expect(snapshot.items[0]?.event.delta).toBe("hello");
    expect(snapshot.background_task_count).toBe(1);
  });
});
