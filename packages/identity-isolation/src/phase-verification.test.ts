import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  buildProfileEnvironment,
  evaluateOmnigentIsolationPolicy,
  identityInterfaceFreezeGate,
  listIdentityProfiles,
  preflightIdentityProfile,
  scanForSecretLeaks,
} from "./index.js";

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

describe("phase verification", () => {
  it("covers the public package surface against the frozen identity fixtures", async () => {
    const profiles = await listIdentityProfiles(
      new URL("../../../fixtures/identity/profiles/", import.meta.url),
    );
    const development = profiles.find(
      (entry) => entry.profile.id === "profile-codex-dev",
    )?.profile;

    const environment = buildProfileEnvironment(development!, {
      hostEnv: readHostEnvFixture("development-host-env.json"),
    });
    const preflight = preflightIdentityProfile(development!, {
      hostEnv: readHostEnvFixture("development-host-env.json"),
    });
    const decision = evaluateOmnigentIsolationPolicy({
      providerMode: "cli",
      profiles: [development!],
      environments: [environment],
      sharedServerRequested: false,
    });

    expect(identityInterfaceFreezeGate).toBe("IF-0-IDENTITY-6");
    expect(preflight.readiness).toBe("ready");
    expect(scanForSecretLeaks(environment.launchEnv).ok).toBe(true);
    expect(decision.launchStrategy).toBe("per_profile_process");
    expect(decision.processProfiles[0]?.launchEnvKeys).toEqual(
      environment.launchEnvKeys,
    );
  });
});
