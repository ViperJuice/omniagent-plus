import { describe, expect, it } from "vitest";

import { listIdentityProfiles } from "./profile-loader.js";

describe("identity profile loader", () => {
  it("lists and parses isolated homes, env allowlists, secret refs, auth-volume refs, and cooldown metadata", async () => {
    const profiles = await listIdentityProfiles(
      new URL("../../../fixtures/identity/profiles/", import.meta.url),
    );
    const byId = new Map(
      profiles.map((entry) => [entry.profile.id, entry] as const),
    );

    const development = byId.get("profile-codex-dev");
    const shared = byId.get("profile-claude-shared");
    const cooldown = byId.get("profile-openai-prod-cooldown");

    expect([...byId.keys()].sort()).toEqual([
      "profile-claude-shared",
      "profile-codex-dev",
      "profile-openai-prod-cooldown",
    ]);
    expect(development?.kind).toBe("development");
    expect(development?.profile.isolation).toBe("host_env");
    expect(development?.profile.envAllowlist).toEqual([
      "OPENAI_API_BASE",
      "OPENAI_ORG",
    ]);
    expect(development?.profile.secretRefs?.[0]?.field).toBe("session_token");
    expect(shared?.profile.authVolumeRef).toBe("auth-volume-anthropic-shared");
    expect(shared?.profile.processOwner).toBe("omni");
    expect(shared?.profile.networkPolicy).toBe("restricted");
    expect(shared?.profile.toolPolicyRef).toBe("tool-policy-claude-shared");
    expect(cooldown?.profile.providerFamilyCooldown?.active).toBe(true);
    expect(cooldown?.profile.identityCooldown?.resetAt).toBe(
      "2026-06-30T19:00:00.000Z",
    );
    expect(cooldown?.profile.maxOpenSessions).toBe(1);
    expect(cooldown?.profile.maxActiveTurns).toBe(1);
  });
});
