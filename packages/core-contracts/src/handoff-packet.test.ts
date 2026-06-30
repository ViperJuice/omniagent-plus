import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildHandoffPacket,
  handoffPacketSchema,
  type HandoffPacketInput,
} from "./handoff-packet.js";

function readFixture<T>(path: string): T {
  return JSON.parse(
    readFileSync(new URL(`../../../fixtures/handoff/${path}`, import.meta.url), "utf8"),
  ) as T;
}

describe("handoff packet builder", () => {
  it("builds a schema-valid packet with bounded evidence and trusted fields", () => {
    const input = readFixture<HandoffPacketInput>("packets/safe-build-input.json");

    const packet = buildHandoffPacket(input);

    expect(handoffPacketSchema.parse(packet)).toEqual(packet);
    expect(packet.evidence.worktreeLease?.id).toBe("lease-main-1");
    expect(packet.evidence.diffSummary?.changedPaths).toEqual([
      "packages/core-contracts/src/handoff-packet.ts",
      "docs/handoff-packets.md",
    ]);
    expect(packet.evidence.priorAgentSummaries?.[0]?.excerpt.reason).toBe(
      "prior_agent_summary_excerpt",
    );
    expect(packet.facts).toContain(
      "The packet builder separates trusted task fields from evidence.",
    );
    expect(packet.requiredOutput?.schema).toBe("phase_closeout.v1");
  });

  it("omits raw history when policy forbids it", () => {
    const input = readFixture<HandoffPacketInput>("packets/raw-history-disabled.json");

    const packet = buildHandoffPacket(input);

    expect(packet.evidence.rawHistory).toBeUndefined();
    expect(packet.evidence.rawHistoryOmittedCount).toBeUndefined();
  });

  it("caps raw history at the policy item limit and records omitted items", () => {
    const input = readFixture<HandoffPacketInput>("packets/safe-build-input.json");

    const packet = buildHandoffPacket(input);

    expect(packet.evidence.rawHistory).toHaveLength(2);
    expect(packet.evidence.rawHistoryOmittedCount).toBe(1);
  });

  it("rejects secret-bearing command output and provider payload evidence", () => {
    const secretBearing = readFixture<HandoffPacketInput>("evidence/secret-bearing-output.json");
    const providerPayload = readFixture<HandoffPacketInput>("evidence/provider-payload.json");

    expect(() => buildHandoffPacket(secretBearing)).toThrow(/contains|include/);
    expect(() => buildHandoffPacket(providerPayload)).toThrow(/provider payload/);
  });
});
