import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { COMMAND_REGISTRY } from "./command-registry.js";
import { executeCli } from "./runtime.js";

function readFixture() {
  return JSON.parse(
    readFileSync(
      new URL("../../../fixtures/cli/health/health.json", import.meta.url),
      "utf8",
    ),
  ) as {
    readonly interfaceFreezeGate: string;
    readonly redactionPosture: string;
    readonly releaseSurfaceDecision: string;
    readonly commands: string[];
  };
}

describe("health command", () => {
  it("reports the CLI entrypoint surface in a schema-backed envelope", async () => {
    const fixture = readFixture();
    const result = await executeCli(["health", "--json"], COMMAND_REGISTRY);
    const parsed = JSON.parse(result.stdout) as {
      readonly ok: boolean;
      readonly result: {
        readonly interfaceFreezeGate: string;
        readonly redactionPosture: string;
        readonly releaseSurfaceDecision: string;
        readonly commands: string[];
      };
    };

    expect(result.exitCode).toBe(0);
    expect(parsed.ok).toBe(true);
    expect(parsed.result.interfaceFreezeGate).toBe(fixture.interfaceFreezeGate);
    expect(parsed.result.redactionPosture).toBe(fixture.redactionPosture);
    expect(parsed.result.releaseSurfaceDecision).toBe(
      fixture.releaseSurfaceDecision,
    );
    expect(parsed.result.commands).toEqual(fixture.commands);
  });
});
