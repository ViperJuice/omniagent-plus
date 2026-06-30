import type { IdentityProfile } from "@omniagent-plus/core-contracts";
import type { OmnigentProviderMode } from "../../omnigent-transport/src/types.js";

import {
  IdentityIsolationError,
  type OmnigentProcessProfile,
  type ResolvedProfileEnvironment,
} from "./types.js";

export function buildOmnigentProcessProfile(
  profile: IdentityProfile,
  environment: ResolvedProfileEnvironment,
  providerMode: OmnigentProviderMode,
  isolationEvidence: OmnigentProcessProfile["isolationEvidence"] = "per_profile_process",
): OmnigentProcessProfile {
  if (environment.profileId !== profile.id) {
    throw new IdentityIsolationError(
      "profile_environment_mismatch",
      "Profile environment metadata must match the target identity profile.",
      {
        expectedProfileId: profile.id,
        receivedProfileId: environment.profileId,
      },
    );
  }

  return {
    schema: "omnigent_process_profile.v0.1",
    profileId: profile.id,
    provider: profile.provider,
    harness: profile.harness,
    providerMode,
    homeDirRef: environment.homeDirRef,
    authVolumeRef: environment.authVolumeRef,
    processOwner: environment.processOwner,
    networkPolicy: environment.networkPolicy,
    toolPolicyRef: environment.toolPolicyRef,
    launchEnvKeys: [...environment.launchEnvKeys],
    secretRefKeys: environment.secretRefs.map((ref) => ref.key),
    isolationEvidence,
  };
}

export function buildOmnigentProcessProfiles(
  profiles: readonly IdentityProfile[],
  environments: readonly ResolvedProfileEnvironment[],
  providerMode: OmnigentProviderMode,
  isolationEvidence: OmnigentProcessProfile["isolationEvidence"] = "per_profile_process",
): OmnigentProcessProfile[] {
  const environmentByProfileId = new Map(
    environments.map((environment) => [environment.profileId, environment] as const),
  );

  return profiles.map((profile) => {
    const environment = environmentByProfileId.get(profile.id);
    if (environment === undefined) {
      throw new IdentityIsolationError(
        "missing_profile_environment",
        "Every active identity profile requires a matching environment plan.",
        {
          profileId: profile.id,
        },
      );
    }
    return buildOmnigentProcessProfile(
      profile,
      environment,
      providerMode,
      isolationEvidence,
    );
  });
}
