import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { buildProfileEnvironment } from "./environment.js";
import { listIdentityProfiles } from "./profile-loader.js";
import {
  buildOmnigentProcessProfile,
  buildOmnigentProcessProfiles,
} from "./process-profile.js";
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

describe("omnigent process profile builder", () => {
  it("builds metadata-only process profiles without raw env or auth leakage", async () => {
    const profiles = await listIdentityProfiles(
      new URL("../../../fixtures/identity/profiles/", import.meta.url),
    );
    const development = profiles.find(
      (entry) => entry.profile.id === "profile-codex-dev",
    )?.profile;
    const shared = profiles.find(
      (entry) => entry.profile.id === "profile-claude-shared",
    )?.profile;

    const developmentEnv = buildProfileEnvironment(development!, {
      hostEnv: readHostEnvFixture("development-host-env.json"),
    });
    const sharedEnv = buildProfileEnvironment(shared!, {
      hostEnv: readHostEnvFixture("shared-host-env.json"),
    });

    const processProfile = buildOmnigentProcessProfile(
      development!,
      developmentEnv,
      "cli",
    );
    const processProfiles = buildOmnigentProcessProfiles(
      [development!, shared!],
      [developmentEnv, sharedEnv],
      "hybrid",
    );

    expect(processProfile.homeDirRef).toBe("/tmp/omniagent/identities/codex-dev");
    expect(processProfile.authVolumeRef).toBe("auth-volume-openai-dev");
    expect(processProfile.launchEnvKeys).toEqual([
      "OPENAI_API_BASE",
      "OPENAI_ORG",
    ]);
    expect(processProfile.secretRefKeys).toEqual(["OpenAI Local Subscription"]);
    expect(processProfiles).toHaveLength(2);
    expect(scanForSecretLeaks(processProfiles).ok).toBe(true);
  });
});
