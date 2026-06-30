import type { RuntimeEvent, SessionHistory } from "@omniagent-plus/core-contracts";

import { OmnigentEventMapper, type OmnigentEventMapperOptions } from "./event-mapper.js";
import type { OmnigentHistoryItem } from "./types.js";

export interface MappedOmnigentHistory {
  readonly history: SessionHistory;
  readonly runtimeEvents: RuntimeEvent[];
  readonly seenItemIds: Set<string>;
}

export interface OmnigentHistoryMapperOptions extends OmnigentEventMapperOptions {
  readonly afterSequence?: number;
}

export function mapOmnigentHistory(
  sessionId: string,
  items: readonly OmnigentHistoryItem[],
  options: OmnigentHistoryMapperOptions = {},
): MappedOmnigentHistory {
  const afterSequence = options.afterSequence;
  const mapper = new OmnigentEventMapper(sessionId, options);
  const runtimeEvents = items.flatMap((item) => mapper.map(item.event));
  const filteredEvents =
    afterSequence === undefined
      ? runtimeEvents
      : runtimeEvents.filter((event) => event.sequence > afterSequence);

  return {
    history: {
      events: filteredEvents,
      nextCursor: filteredEvents.at(-1)?.sequence ?? afterSequence ?? 0,
      sessionId,
    },
    runtimeEvents,
    seenItemIds: new Set(mapper.seenItemIds),
  };
}
