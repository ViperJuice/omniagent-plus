import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { COMMAND_REGISTRY } from "./command-registry.js";
import { executeCli } from "./runtime.js";

describe("coordination commands", () => {
  it("acquires and lists local coordination leases", async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), "cli-coordination-"));
    const acquired = await executeCli(
      [
        "coordination",
        "leases",
        "acquire",
        "--holder",
        "holder-a",
        "--scope",
        "path-set:packages/cli",
        "--mode",
        "hard",
        "--ttl-seconds",
        "120",
        "--state-root",
        stateRoot,
        "--json",
      ],
      COMMAND_REGISTRY,
    );
    const listed = await executeCli(
      [
        "coordination",
        "leases",
        "list",
        "--scope",
        "path-set:packages/cli",
        "--state-root",
        stateRoot,
        "--json",
      ],
      COMMAND_REGISTRY,
    );
    const acquireEnvelope = JSON.parse(acquired.stdout) as {
      readonly result: {
        readonly granted: boolean;
        readonly lease: { readonly holder: string };
      };
    };
    const listEnvelope = JSON.parse(listed.stdout) as {
      readonly result: {
        readonly count: number;
      };
    };

    expect(acquired.exitCode).toBe(0);
    expect(acquireEnvelope.result.granted).toBe(true);
    expect(acquireEnvelope.result.lease.holder).toBe("holder-a");
    expect(listed.exitCode).toBe(0);
    expect(listEnvelope.result.count).toBe(1);
  });

  it("keeps inbox messages separate from lease state", async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), "cli-coordination-"));
    await executeCli(
      [
        "coordination",
        "leases",
        "acquire",
        "--holder",
        "holder-a",
        "--scope",
        "path-set:packages/cli",
        "--mode",
        "hard",
        "--ttl-seconds",
        "120",
        "--state-root",
        stateRoot,
        "--json",
      ],
      COMMAND_REGISTRY,
    );
    const sent = await executeCli(
      [
        "coordination",
        "inbox",
        "send",
        "--type",
        "request-yield",
        "--sender",
        "holder-b",
        "--scope",
        "path-set:packages/cli",
        "--target-holder",
        "holder-a",
        "--state-root",
        stateRoot,
        "--json",
      ],
      COMMAND_REGISTRY,
    );
    const messages = await executeCli(
      [
        "coordination",
        "inbox",
        "list",
        "--scope",
        "path-set:packages/cli",
        "--state-root",
        stateRoot,
        "--json",
      ],
      COMMAND_REGISTRY,
    );
    const leases = await executeCli(
      [
        "coordination",
        "leases",
        "list",
        "--state-root",
        stateRoot,
        "--json",
      ],
      COMMAND_REGISTRY,
    );
    const messageEnvelope = JSON.parse(messages.stdout) as {
      readonly result: {
        readonly count: number;
      };
    };
    const leaseEnvelope = JSON.parse(leases.stdout) as {
      readonly result: {
        readonly count: number;
      };
    };

    expect(sent.exitCode).toBe(0);
    expect(messages.exitCode).toBe(0);
    expect(messageEnvelope.result.count).toBe(1);
    expect(leaseEnvelope.result.count).toBe(1);
  });

  it("blocks route-task before launch when a hard coordination lease conflicts", async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), "cli-coordination-"));
    await executeCli(
      [
        "coordination",
        "leases",
        "acquire",
        "--holder",
        "holder-a",
        "--scope",
        "path-set:packages/cli",
        "--mode",
        "hard",
        "--ttl-seconds",
        "120",
        "--state-root",
        stateRoot,
        "--json",
      ],
      COMMAND_REGISTRY,
    );

    const blocked = await executeCli(
      [
        "route-task",
        "--task-id",
        "task-coordination-block",
        "--coordination-scope",
        "path-set:packages/cli/src",
        "--coordination-holder",
        "holder-b",
        "--coordination-request-yield",
        "--state-root",
        stateRoot,
        "--json",
      ],
      COMMAND_REGISTRY,
    );
    const envelope = JSON.parse(blocked.stderr) as {
      readonly error: {
        readonly category: string;
        readonly details?: {
          readonly result?: {
            readonly routeDecision?: {
              readonly leaseArbitration?: {
                readonly status: string;
              };
            };
          };
        };
      };
    };

    expect(blocked.exitCode).toBe(7);
    expect(envelope.error.category).toBe("route_block");
    expect(envelope.error.details?.result?.routeDecision?.leaseArbitration?.status).toBe(
      "blocked_hard_conflict",
    );
  });
});
