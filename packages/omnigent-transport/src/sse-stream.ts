import {
  omnigentStreamEventTypes,
  type OmnigentRawEvent,
} from "./types.js";

export type OmnigentSseSkipReason =
  | "invalid_json"
  | "non_object_payload"
  | "unknown_event_type";

export interface OmnigentSseSkip {
  readonly payload: string;
  readonly reason: OmnigentSseSkipReason;
}

function isKnownOmnigentEventType(value: unknown): value is OmnigentRawEvent["type"] {
  return (
    value === "[DONE]" ||
    (typeof value === "string" &&
      (omnigentStreamEventTypes as readonly string[]).includes(value))
  );
}

function parseFramePayload(
  payload: string,
  onSkip?: (skip: OmnigentSseSkip) => void,
): OmnigentRawEvent | null {
  if (payload === "[DONE]") {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    onSkip?.({
      payload,
      reason: "invalid_json",
    });
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    onSkip?.({
      payload,
      reason: "non_object_payload",
    });
    return null;
  }

  const eventType = (parsed as Record<string, unknown>).type;
  if (!isKnownOmnigentEventType(eventType) || eventType === "[DONE]") {
    onSkip?.({
      payload,
      reason: "unknown_event_type",
    });
    return null;
  }

  return parsed as OmnigentRawEvent;
}

export async function* parseOmnigentSseStream(
  stream: ReadableStream<Uint8Array>,
  onSkip?: (skip: OmnigentSseSkip) => void,
): AsyncIterable<OmnigentRawEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, {
      stream: !done,
    });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const dataLines = frame
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());
      if (dataLines.length === 0) {
        continue;
      }
      const payload = dataLines.join("\n");
      const event = parseFramePayload(payload, onSkip);
      if (event) {
        yield event;
      }
    }

    if (done) {
      break;
    }
  }

  if (buffer.trim().length > 0) {
    const payload = buffer
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .join("\n");
    const event = parseFramePayload(payload, onSkip);
    if (event) {
      yield event;
    }
  }
}
