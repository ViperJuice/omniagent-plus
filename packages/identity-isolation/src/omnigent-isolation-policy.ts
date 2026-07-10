import type { IdentityProfile } from "@consiliency/runtime-provider";
import type { OmnigentProviderMode } from "../../omnigent-transport/src/types.js";

import { buildOmnigentProcessProfiles } from "./process-profile.js";
import type {
  OmnigentIsolationDecision,
  ResolvedProfileEnvironment,
  SharedHttpIsolationEvidence,
} from "./types.js";

export interface EvaluateOmnigentIsolationPolicyOptions {
  readonly providerMode: OmnigentProviderMode;
  readonly profiles: readonly IdentityProfile[];
  readonly environments: readonly ResolvedProfileEnvironment[];
  readonly sharedServerRequested?: boolean;
  readonly sharedHttpIsolationEvidence?: SharedHttpIsolationEvidence;
}

function hasSharedIsolationEvidence(
  evidence: SharedHttpIsolationEvidence | undefined,
): evidence is SharedHttpIsolationEvidence {
  return (
    evidence?.perSessionHome === true &&
    evidence.perSessionEnv === true &&
    evidence.perSessionCredentials === true &&
    evidence.perSessionAuthVolume === true
  );
}

export function evaluateOmnigentIsolationPolicy(
  options: EvaluateOmnigentIsolationPolicyOptions,
): OmnigentIsolationDecision {
  const sharedServerRequested =
    options.sharedServerRequested ?? options.providerMode === "http";

  if (options.providerMode === "http" && sharedServerRequested) {
    if (!hasSharedIsolationEvidence(options.sharedHttpIsolationEvidence)) {
      return {
        schema: "omnigent_identity_isolation_decision.v0.1",
        providerMode: options.providerMode,
        launchStrategy: "blocked_shared_http",
        sharedModeAllowed: false,
        allowed: false,
        reason:
          "Shared HTTP/server mode requires explicit per-session HOME, env, credential, and auth-volume isolation evidence.",
        processProfiles: buildOmnigentProcessProfiles(
          options.profiles,
          options.environments,
          options.providerMode,
          "per_profile_process",
        ),
      };
    }

    return {
      schema: "omnigent_identity_isolation_decision.v0.1",
      providerMode: options.providerMode,
      launchStrategy: "shared_http_allowed",
      sharedModeAllowed: true,
      allowed: true,
      reason:
        "Shared HTTP/server mode is allowed because explicit per-session HOME, env, credential, and auth-volume isolation evidence is present.",
      processProfiles: buildOmnigentProcessProfiles(
        options.profiles,
        options.environments,
        options.providerMode,
        "shared_http_session_isolation",
      ),
      evidence: options.sharedHttpIsolationEvidence,
    };
  }

  return {
    schema: "omnigent_identity_isolation_decision.v0.1",
    providerMode: options.providerMode,
    launchStrategy: "per_profile_process",
    sharedModeAllowed: false,
    allowed: true,
    reason:
      options.providerMode === "http"
        ? "Shared HTTP isolation is not proven, so HTTP-backed identities must run with one process profile per active identity."
        : "CLI and hybrid modes require one process profile per active identity.",
    processProfiles: buildOmnigentProcessProfiles(
      options.profiles,
      options.environments,
      options.providerMode,
      "per_profile_process",
    ),
  };
}
