import type { IdentityProfile } from "@omniagent-plus/core-contracts";

import {
  detectIdentityProfileKind,
  IdentityIsolationError,
  type ResolvedProfileEnvironment,
} from "./types.js";

export interface BuildProfileEnvironmentOptions {
  readonly hostEnv?: Record<string, string | undefined>;
}

function normalizeAllowlist(profile: IdentityProfile): string[] {
  return [...new Set(profile.envAllowlist ?? [])]
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .sort();
}

export function describeProfileEnvironment(
  profile: IdentityProfile,
  options: BuildProfileEnvironmentOptions = {},
): ResolvedProfileEnvironment {
  const envAllowlist = normalizeAllowlist(profile);
  const launchEnvEntries = envAllowlist.flatMap((key) => {
    const value = options.hostEnv?.[key];
    return value === undefined ? [] : ([[key, value]] as const);
  });
  const launchEnv = Object.fromEntries(launchEnvEntries);

  return {
    schema: "identity_environment_plan.v0.1",
    profileId: profile.id,
    kind: detectIdentityProfileKind(profile),
    isolation: profile.isolation,
    launchEnv,
    launchEnvKeys: Object.keys(launchEnv).sort(),
    redactedEnv: { ...(profile.env ?? {}) },
    envAllowlist,
    secretRefs: [...(profile.secretRefs ?? [])],
    authVolumeRef: profile.authVolumeRef,
    homeDirRef: profile.homeDir,
    processOwner: profile.processOwner,
    networkPolicy: profile.networkPolicy,
    toolPolicyRef: profile.toolPolicyRef,
  };
}

export function buildProfileEnvironment(
  profile: IdentityProfile,
  options: BuildProfileEnvironmentOptions = {},
): ResolvedProfileEnvironment {
  const environment = describeProfileEnvironment(profile, options);

  if (
    profile.isolation === "host_env" &&
    environment.kind !== "development"
  ) {
    throw new IdentityIsolationError(
      "host_env_requires_development_profile",
      "host_env profiles are development-only and cannot be used for shared or production identities.",
      {
        profileId: profile.id,
        profileKind: environment.kind,
      },
    );
  }

  if (
    profile.isolation === "host_env" &&
    environment.envAllowlist.length === 0
  ) {
    throw new IdentityIsolationError(
      "host_env_requires_allowlist",
      "host_env profiles require an explicit non-empty env allowlist.",
      {
        profileId: profile.id,
      },
    );
  }

  return environment;
}
