import { describe, expect, it } from "vitest";

import { parseOmnigentSseStream } from "./sse-stream.js";

async function collectAsync<T>(values: AsyncIterable<T>): Promise<T[]> {
  const result: T[] = [];
  for await (const value of values) {
    result.push(value);
  }
  return result;
}

function toStream(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

describe("sse stream parser", () => {
  it("skips malformed JSON, non-objects, and unknown event types", async () => {
    const skipped: string[] = [];
    const events = await collectAsync(
      parseOmnigentSseStream(
        toStream(
          [
            "data: not-json",
            "",
            'data: "not an object"',
            "",
            'data: {"type":"unknown.event"}',
            "",
            'data: {"id":"item-1","itemId":"item-1","occurredAt":"2026-06-30T00:00:00.000Z","sessionId":"session-1","type":"response.output_text.delta","delta":"hi"}',
            "",
            "data: [DONE]",
            "",
          ].join("\n"),
        ),
        (skip) => {
          skipped.push(skip.reason);
        },
      ),
    );

    expect(skipped).toEqual([
      "invalid_json",
      "non_object_payload",
      "unknown_event_type",
    ]);
    expect(events).toHaveLength(1);
    expect(events[0]?.delta).toBe("hi");
  });
});
