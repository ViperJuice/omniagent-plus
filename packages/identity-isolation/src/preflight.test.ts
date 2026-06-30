import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { listIdentityProfiles } from "./profile-loader.js";
import { preflightIdentityProfile } from "./preflight.js";
import { scanForSecretLeaks } from "./secret-redaction.js";

function readHostEnvFixture(name: string): Record<string, string> {
  return (
    JSON.parse(
      readFileSync(
        new URL(`../../../fixtures/identity/env/${name}`, import.meta.url),
        "utf8",
      ),
    ) as { hostEnv: Record<string, string> }
  ).hostEnv;
}

describe("identity preflight", () => {
  it("maps ready, cooldown, degraded, blocked, and needs-auth outcomes to IdentityProfileStatus", async () => {
    const profiles = await listIdentityProfiles(
      new URL("../../../fixtures/identity/profiles/", import.meta.url),
    );
    const byId = new Map(
      profiles.map((entry) => [entry.profile.id, entry.profile] as const),
    );

    const ready = preflightIdentityProfile(byId.get("profile-codex-dev")!, {
      hostEnv: readHostEnvFixture("development-host-env.json"),
      activeSessions: 1,
      activeTurns: 1,
    });
    const cooldown = preflightIdentityProfile(
      byId.get("profile-openai-prod-cooldown")!,
      {
        activeSessions: 0,
        activeTurns: 0,
      },
    );
    const degraded = preflightIdentityProfile(
      byId.get("profile-claude-shared")!,
      {
        activeSessions: 3,
        activeTurns: 0,
        authAvailable: true,
      },
    );
    const blocked = preflightIdentityProfile(byId.get("profile-claude-shared")!, {
      blockedReason: "manual_hold",
    });
    const needsAuth = preflightIdentityProfile(
      byId.get("profile-claude-shared")!,
      {
        authAvailable: false,
      },
    );

    expect(ready.readiness).toBe("ready");
    expect(ready.status.status).toBe("ready");
    expect(cooldown.readiness).toBe("cooldown");
    expect(cooldown.status.status).toBe("cooldown");
    expect(cooldown.failure?.category).toBe("rate_limit");
    expect(degraded.readiness).toBe("degraded");
    expect(degraded.status.status).toBe("degraded");
    expect(degraded.failure?.category).toBe("concurrency_limit");
    expect(blocked.readiness).toBe("blocked");
    expect(blocked.status.status).toBe("blocked");
    expect(blocked.failure?.category).toBe("policy_denied");
    expect(needsAuth.readiness).toBe("needs_auth");
    expect(needsAuth.status.status).toBe("blocked");
    expect(needsAuth.status.reason).toBe("needs_auth");
    expect(needsAuth.failure?.category).toBe("auth");
    expect(
      scanForSecretLeaks({
        ready: ready.status,
        cooldown: cooldown.status,
        degraded: degraded.status,
        blocked: blocked.status,
        needsAuth: needsAuth.status,
      }).ok,
    ).toBe(true);
  });
});
