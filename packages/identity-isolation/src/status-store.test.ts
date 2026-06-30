import { readFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { listIdentityProfiles } from "./profile-loader.js";
import { preflightIdentityProfile } from "./preflight.js";
import { IdentityProfileStatusStore } from "./status-store.js";

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

describe("identity profile status store", () => {
  it("persists metadata-only preflight statuses through AuditLedger.appendIdentityProfileStatus", async () => {
    const profiles = await listIdentityProfiles(
      new URL("../../../fixtures/identity/profiles/", import.meta.url),
    );
    const byId = new Map(
      profiles.map((entry) => [entry.profile.id, entry.profile] as const),
    );
    const rootDir = await mkdtemp(join(tmpdir(), "identity-status-store-"));
    const store = await IdentityProfileStatusStore.open({ rootDir });

    await store.appendPreflight(
      preflightIdentityProfile(byId.get("profile-codex-dev")!, {
        hostEnv: readHostEnvFixture("development-host-env.json"),
      }),
    );
    await store.appendPreflight(
      preflightIdentityProfile(byId.get("profile-claude-shared")!, {
        authAvailable: false,
      }),
    );

    const sharedStatuses = await store.listByProfileId("profile-claude-shared");
    const ledgerRaw = readFileSync(join(rootDir, "ledger.jsonl"), "utf8");

    expect(sharedStatuses.map((status) => status.reason)).toEqual(["needs_auth"]);
    expect(ledgerRaw).toContain("\"identity_profile_status\"");
    expect(ledgerRaw).not.toContain("sk-live-should-not-pass");
    expect(ledgerRaw).not.toContain("Bearer unlisted-secret-token");
  });
});
