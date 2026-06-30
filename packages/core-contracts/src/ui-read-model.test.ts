import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  uiControlSnapshotSchema,
  uiReadModelInterfaceFreezeGate,
  type UiControlSnapshot,
} from "./index.js";

function readFixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(
      new URL(`../../../fixtures/ui/read-models/${name}`, import.meta.url),
      "utf8",
    ),
  ) as T;
}

describe("ui read-model contracts", () => {
  it("parses the frozen UI control snapshot fixture through the public exports", () => {
    const snapshot = uiControlSnapshotSchema.parse(
      readFixture<UiControlSnapshot>("control-snapshot.json"),
    );

    expect(snapshot.interfaceFreezeGate).toBe(uiReadModelInterfaceFreezeGate);
    expect(snapshot.sessions.map((session) => session.sessionId)).toContain(
      "session-parent",
    );
    expect(snapshot.activeTurns[0]?.pendingApprovalRequestId).toBe("approval-1");
    expect(snapshot.handoffs[0]?.changedFileCount).toBe(1);
  });

  it("rejects secret-bearing metadata, secret paths, and unsafe evidence excerpts", () => {
    const snapshot = readFixture<UiControlSnapshot>("control-snapshot.json");

    const secretTitle = structuredClone(snapshot);
    secretTitle.sessions[0]!.title = "authorization=Bearer sk-test-secret";
    expect(() => uiControlSnapshotSchema.parse(secretTitle)).toThrow(/contains/);

    const secretPath = structuredClone(snapshot);
    secretPath.evidenceRefs[0]!.path = "/home/example/.ssh/id_ed25519";
    expect(() => uiControlSnapshotSchema.parse(secretPath)).toThrow(/absolute paths|secret-bearing/);

    const providerPayload = structuredClone(snapshot);
    providerPayload.evidenceRefs[0]!.excerpt = '{"messages":[{"role":"assistant"}]}';
    expect(() => uiControlSnapshotSchema.parse(providerPayload)).toThrow(/provider payload/);
  });
});
