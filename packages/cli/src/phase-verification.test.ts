import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { COMMAND_REGISTRY } from "./command-registry.js";
import { executeCli } from "./runtime.js";

const profilesDir = new URL("../../../fixtures/identity/profiles", import.meta.url).pathname;

describe("phase verification", () => {
  it("registers the full IF-0-CLI-11 command surface", () => {
    expect(COMMAND_REGISTRY.map((entry) => entry.key)).toEqual([
      "health",
      "sessions list",
      "sessions show",
      "identities list",
      "identities preflight",
      "worktrees list",
      "worktrees cleanup",
      "classify-limit",
      "route-task",
    ]);
  });

  it("maps identity policy blocks and route blocks to typed exit codes", async () => {
    const stateRoot = await mkdtemp(join(tmpdir(), "cli-phase-verify-"));

    const identityResult = await executeCli(
      [
        "identities",
        "preflight",
        "--profile-id",
        "profile-claude-shared",
        "--auth-unavailable",
        "--profiles-dir",
        profilesDir,
        "--state-root",
        stateRoot,
        "--json",
      ],
      COMMAND_REGISTRY,
    );
    const identityEnvelope = JSON.parse(identityResult.stderr) as {
      readonly error: {
        readonly category: string;
      };
    };

    expect(identityResult.exitCode).toBe(5);
    expect(identityEnvelope.error.category).toBe("policy_block");

    const routeResult = await executeCli(
      [
        "route-task",
        "--task-id",
        "task-route-blocked",
        "--preferred-provider",
        "openai",
        "--preferred-harness",
        "codex",
        "--preferred-identity-profile-id",
        "profile-openai-prod-cooldown",
        "--profiles-dir",
        profilesDir,
        "--state-root",
        stateRoot,
        "--json",
      ],
      COMMAND_REGISTRY,
    );
    const routeEnvelope = JSON.parse(routeResult.stderr) as {
      readonly error: {
        readonly category: string;
      };
    };

    expect(routeResult.exitCode).toBe(7);
    expect(routeEnvelope.error.category).toBe("route_block");
  });
});
