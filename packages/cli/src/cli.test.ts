import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { COMMAND_REGISTRY } from "./command-registry.js";
import { executeCli } from "./runtime.js";

function readCommandsFixture(): string[] {
  const parsed = JSON.parse(
    readFileSync(
      new URL("../../../fixtures/cli/e2e/commands.json", import.meta.url),
      "utf8",
    ),
  ) as { commands: string[] };

  return parsed.commands;
}

describe("cli entrypoint", () => {
  it("renders deterministic human output for the full command registry", async () => {
    const commands = readCommandsFixture();
    const result = await executeCli(["health"], COMMAND_REGISTRY);

    expect(result.exitCode).toBe(0);
    for (const command of commands) {
      expect(result.stdout).toContain(command);
    }
  });

  it("returns typed missing-record errors on stderr", async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), "cli-e2e-errors-"));
    const result = await executeCli(
      [
        "sessions",
        "show",
        "--session-id",
        "missing-session",
        "--state-root",
        stateRoot,
        "--json",
      ],
      COMMAND_REGISTRY,
    );
    const parsed = JSON.parse(result.stderr) as {
      readonly error: {
        readonly category: string;
        readonly code: number;
      };
    };

    expect(result.exitCode).toBe(3);
    expect(parsed.error.category).toBe("missing_record");
    expect(parsed.error.code).toBe(3);
  });
});
