import { describe, expect, it } from "vitest";

import {
  consiliencyLeaseSchema,
  coordinationContractSchemaPaths,
  coordinationContractVectorPaths,
  isLeaseExpired,
  loadCoordinationContractArtifact,
  loadCoordinationContractSchemas,
  loadCoordinationContractVectors,
  toContractTimestamp,
} from "./coordination-contract.js";

describe("coordination contract adapter", () => {
  it("loads lease and channel schemas from the published contract package", () => {
    const schemas = loadCoordinationContractSchemas();

    expect(Object.keys(schemas).sort()).toEqual([...coordinationContractSchemaPaths].sort());
    expect(schemas["core/schemas/lease.schema.json"]).toMatchObject({
      title: "Consiliency coordination lease",
      properties: {
        schema: { const: "consiliency.lease.v1" },
      },
    });
    expect(schemas["core/schemas/coordination-channel-protocol.schema.json"]).toMatchObject({
      properties: {
        authority: {
          properties: {
            inbox_authoritative: { const: false },
            message_may_mutate_lease: { const: false },
          },
        },
      },
    });
  });

  it("loads lease and coordination conformance vectors from the published contract package", () => {
    const vectors = loadCoordinationContractVectors();

    expect(Object.keys(vectors).sort()).toEqual([...coordinationContractVectorPaths].sort());
    expect(loadCoordinationContractArtifact("conformance/vectors/lease-hard-mode-atomic.json")).toMatchObject({
      id: "lease-hard-mode-atomic",
    });
    expect(loadCoordinationContractArtifact("conformance/vectors/coordination-message-does-not-mutate-lease.json")).toMatchObject({
      id: "coordination-message-does-not-mutate-lease",
    });
  });

  it("validates local lease payloads against the published v1 shape", () => {
    const lease = consiliencyLeaseSchema.parse({
      schema: "consiliency.lease.v1",
      lease_id: "lease:test-1",
      holder: "host:pid:session",
      acquired_at: toContractTimestamp("2026-07-08T21:00:00.123Z"),
      ttl_seconds: 30,
      heartbeat_at: "2026-07-08T21:00:00Z",
      mode: "hard",
      scope: {
        granularity: "path-set",
        selector: ["packages/worktree-leasing"],
      },
      phase: "CS-2.2",
    });

    expect(isLeaseExpired(lease, "2026-07-08T21:00:29Z")).toBe(false);
    expect(isLeaseExpired(lease, "2026-07-08T21:00:30Z")).toBe(true);
  });
});
