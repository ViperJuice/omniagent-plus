import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildProfileEnvironment } from "./environment.js";
import { evaluateOmnigentIsolationPolicy } from "./omnigent-isolation-policy.js";
import { listIdentityProfiles } from "./profile-loader.js";
import { preflightIdentityProfile } from "./preflight.js";
import { scanForSecretLeaks } from "./secret-redaction.js";
import { IdentityProfileStatusStore } from "./status-store.js";

interface ConcurrencyFixture {
  readonly profileIds: string[];
  readonly hostEnvByProfileId: Record<string, Record<string, string>>;
}

function readConcurrencyFixture(): ConcurrencyFixture {
  return JSON.parse(
    readFileSync(
      new URL("../../../fixtures/identity/concurrency/two-profiles.json", import.meta.url),
      "utf8",
    ),
  ) as ConcurrencyFixture;
}

describe("concurrent identity isolation", () => {
  it("keeps env keys, homes, auth-volume refs, status records, and process profiles separated across identities", async () => {
    const fixture = readConcurrencyFixture();
    const profiles = await listIdentityProfiles(
      new URL("../../../fixtures/identity/profiles/", import.meta.url),
    );
    const profileMap = new Map(
      profiles.map((entry) => [entry.profile.id, entry.profile] as const),
    );
    const activeProfiles = fixture.profileIds.map(
      (profileId) => profileMap.get(profileId)!,
    );
    const environments = activeProfiles.map((profile) =>
      buildProfileEnvironment(profile, {
        hostEnv: fixture.hostEnvByProfileId[profile.id],
      }),
    );
    const results = activeProfiles.map((profile) =>
      preflightIdentityProfile(profile, {
        hostEnv: fixture.hostEnvByProfileId[profile.id],
      }),
    );
    const store = await IdentityProfileStatusStore.open({
      rootDir: await mkdtemp(join(tmpdir(), "identity-concurrency-")),
    });

    await Promise.all(results.map((result) => store.appendPreflight(result)));

    const firstStatuses = await store.listByProfileId(activeProfiles[0]!.id);
    const secondStatuses = await store.listByProfileId(activeProfiles[1]!.id);
    const processDecision = evaluateOmnigentIsolationPolicy({
      providerMode: "hybrid",
      profiles: activeProfiles,
      environments,
      sharedServerRequested: false,
    });

    expect(environments[0]?.launchEnv).not.toHaveProperty("ANTHROPIC_BASE_URL");
    expect(environments[1]?.launchEnv).not.toHaveProperty("OPENAI_API_BASE");
    expect(environments[0]?.homeDirRef).not.toBe(environments[1]?.homeDirRef);
    expect(environments[0]?.authVolumeRef).not.toBe(
      environments[1]?.authVolumeRef,
    );
    expect(firstStatuses.every((status) => status.profileId === activeProfiles[0]!.id)).toBe(
      true,
    );
    expect(secondStatuses.every((status) => status.profileId === activeProfiles[1]!.id)).toBe(
      true,
    );
    expect(processDecision.processProfiles[0]?.launchEnvKeys).not.toEqual(
      processDecision.processProfiles[1]?.launchEnvKeys,
    );
    expect(scanForSecretLeaks(processDecision.processProfiles).ok).toBe(true);
  });
});
