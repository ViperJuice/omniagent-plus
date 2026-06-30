import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { AuditLedger } from "@omniagent-plus/state-ledger";

import { OmnigentCapabilityStore } from "./capability-store.js";
import { snapshotFromHealth } from "./capability-probe.js";

describe("capability store", () => {
  it("persists capability snapshots through AuditLedger.appendCapabilitySnapshot", async () => {
    const ledger = await AuditLedger.open({
      rootDir: await mkdtemp(join(tmpdir(), "omnigent-capability-store-")),
    });
    const store = new OmnigentCapabilityStore(ledger);
    const snapshot = snapshotFromHealth({
      activeSessions: 0,
      available: true,
      backend: "omnigent-http",
      runtime: "omnigent",
      sessionStateDrift: [],
    });

    const record = await store.append(snapshot);

    expect(record.kind).toBe("capability_snapshot");
    expect(record.payload.capabilities.canClose).toBe(true);
  });
});
