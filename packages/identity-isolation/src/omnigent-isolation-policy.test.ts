import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { buildProfileEnvironment } from "./environment.js";
import { evaluateOmnigentIsolationPolicy } from "./omnigent-isolation-policy.js";
import { listIdentityProfiles } from "./profile-loader.js";

interface IsolationFixture {
  readonly providerMode: "http";
  readonly sharedServerRequested: boolean;
  readonly profileIds: string[];
  readonly evidence?: {
    readonly schema: "shared_http_identity_isolation.v0.1";
    readonly perSessionHome: boolean;
    readonly perSessionEnv: boolean;
    readonly perSessionCredentials: boolean;
    readonly perSessionAuthVolume: boolean;
    readonly source: "contract_freeze";
  };
}

interface ConcurrencyFixture {
  readonly profileIds: string[];
  readonly hostEnvByProfileId: Record<string, Record<string, string>>;
}

function readIsolationFixture(name: string): IsolationFixture {
  return JSON.parse(
    readFileSync(
      new URL(`../../../fixtures/identity/omnigent-isolation/${name}`, import.meta.url),
      "utf8",
    ),
  ) as IsolationFixture;
}

function readConcurrencyFixture(): ConcurrencyFixture {
  return JSON.parse(
    readFileSync(
      new URL("../../../fixtures/identity/concurrency/two-profiles.json", import.meta.url),
      "utf8",
    ),
  ) as ConcurrencyFixture;
}

describe("omnigent isolation policy", () => {
  it("blocks shared HTTP without explicit per-session isolation evidence and requires per-profile CLI or hybrid processes", async () => {
    const profiles = await listIdentityProfiles(
      new URL("../../../fixtures/identity/profiles/", import.meta.url),
    );
    const profileMap = new Map(
      profiles.map((entry) => [entry.profile.id, entry.profile] as const),
    );
    const blockedFixture = readIsolationFixture("shared-http-blocked.json");
    const concurrencyFixture = readConcurrencyFixture();
    const activeProfiles = blockedFixture.profileIds.map(
      (profileId) => profileMap.get(profileId)!,
    );
    const environments = activeProfiles.map((profile) =>
      buildProfileEnvironment(profile, {
        hostEnv: concurrencyFixture.hostEnvByProfileId[profile.id],
      }),
    );

    const blockedDecision = evaluateOmnigentIsolationPolicy({
      providerMode: blockedFixture.providerMode,
      profiles: activeProfiles,
      environments,
      sharedServerRequested: blockedFixture.sharedServerRequested,
    });
    const cliDecision = evaluateOmnigentIsolationPolicy({
      providerMode: "cli",
      profiles: activeProfiles,
      environments,
      sharedServerRequested: false,
    });

    expect(blockedDecision.allowed).toBe(false);
    expect(blockedDecision.launchStrategy).toBe("blocked_shared_http");
    expect(blockedDecision.reason).toContain("per-session HOME");
    expect(cliDecision.allowed).toBe(true);
    expect(cliDecision.launchStrategy).toBe("per_profile_process");
    expect(cliDecision.processProfiles).toHaveLength(2);
  });

  it("allows shared HTTP only when contract evidence proves per-session isolation", async () => {
    const profiles = await listIdentityProfiles(
      new URL("../../../fixtures/identity/profiles/", import.meta.url),
    );
    const profileMap = new Map(
      profiles.map((entry) => [entry.profile.id, entry.profile] as const),
    );
    const allowedFixture = readIsolationFixture("shared-http-allowed.json");
    const concurrencyFixture = readConcurrencyFixture();
    const activeProfiles = allowedFixture.profileIds.map(
      (profileId) => profileMap.get(profileId)!,
    );
    const environments = activeProfiles.map((profile) =>
      buildProfileEnvironment(profile, {
        hostEnv: concurrencyFixture.hostEnvByProfileId[profile.id],
      }),
    );

    const allowedDecision = evaluateOmnigentIsolationPolicy({
      providerMode: allowedFixture.providerMode,
      profiles: activeProfiles,
      environments,
      sharedServerRequested: allowedFixture.sharedServerRequested,
      sharedHttpIsolationEvidence: allowedFixture.evidence,
    });

    expect(allowedDecision.allowed).toBe(true);
    expect(allowedDecision.launchStrategy).toBe("shared_http_allowed");
    expect(
      allowedDecision.processProfiles.every(
        (profile) =>
          profile.isolationEvidence === "shared_http_session_isolation",
      ),
    ).toBe(true);
  });
});
