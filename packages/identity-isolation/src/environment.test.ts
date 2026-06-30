import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { buildProfileEnvironment } from "./environment.js";
import { listIdentityProfiles } from "./profile-loader.js";
import { IdentityIsolationError } from "./types.js";

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

describe("profile environment builder", () => {
  it("builds allowlist-only launch environments and never copies the full host env", async () => {
    const profiles = await listIdentityProfiles(
      new URL("../../../fixtures/identity/profiles/", import.meta.url),
    );
    const development = profiles.find(
      (entry) => entry.profile.id === "profile-codex-dev",
    )?.profile;

    const environment = buildProfileEnvironment(development!, {
      hostEnv: readHostEnvFixture("development-host-env.json"),
    });

    expect(environment.kind).toBe("development");
    expect(environment.launchEnv).toEqual({
      OPENAI_API_BASE: "https://api.openai.example",
      OPENAI_ORG: "org-dev",
    });
    expect(environment.launchEnv).not.toHaveProperty("OPENAI_API_KEY");
    expect(environment.launchEnv).not.toHaveProperty("UNLISTED_SECRET");
  });

  it("rejects host_env for shared profiles and for missing allowlists", async () => {
    const profiles = await listIdentityProfiles(
      new URL("../../../fixtures/identity/profiles/", import.meta.url),
    );
    const shared = profiles.find(
      (entry) => entry.profile.id === "profile-claude-shared",
    )?.profile;
    const development = profiles.find(
      (entry) => entry.profile.id === "profile-codex-dev",
    )?.profile;

    expect(() =>
      buildProfileEnvironment(
        {
          ...shared!,
          isolation: "host_env",
        },
        {
          hostEnv: readHostEnvFixture("shared-host-env.json"),
        },
      ),
    ).toThrowError(IdentityIsolationError);

    expect(() =>
      buildProfileEnvironment(
        {
          ...development!,
          envAllowlist: [],
        },
        {
          hostEnv: readHostEnvFixture("development-host-env.json"),
        },
      ),
    ).toThrowError(IdentityIsolationError);
  });
});
