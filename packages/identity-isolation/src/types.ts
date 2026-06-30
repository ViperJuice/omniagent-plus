import {
  createRuntimeFailure,
  type IdentityProfile,
  type IdentityProfileStatus,
  type RedactedConfigValue,
  type RuntimeFailure,
  type RuntimeFailureActor,
  type RuntimeFailureCategory,
  type RuntimeFailureScope,
} from "@omniagent-plus/core-contracts";
import type { OmnigentProviderMode } from "../../omnigent-transport/src/types.js";

export const identityInterfaceFreezeGate = "IF-0-IDENTITY-6";

export const identityProfileKinds = [
  "development",
  "shared",
  "production",
] as const;
export type IdentityProfileKind = (typeof identityProfileKinds)[number];

export const identityProfileReadinessStates = [
  "ready",
  "cooldown",
  "degraded",
  "blocked",
  "needs_auth",
] as const;
export type IdentityProfileReadiness =
  (typeof identityProfileReadinessStates)[number];

export type MetadataOnlyValue =
  | string
  | number
  | boolean
  | readonly string[]
  | null
  | undefined;

type IdentitySecretRef = NonNullable<IdentityProfile["secretRefs"]>[number];

export interface ResolvedProfileEnvironment {
  readonly schema: "identity_environment_plan.v0.1";
  readonly profileId: string;
  readonly kind: IdentityProfileKind;
  readonly isolation: IdentityProfile["isolation"];
  readonly launchEnv: Record<string, string>;
  readonly launchEnvKeys: string[];
  readonly redactedEnv: Record<string, RedactedConfigValue>;
  readonly envAllowlist: string[];
  readonly secretRefs: IdentitySecretRef[];
  readonly authVolumeRef?: string;
  readonly homeDirRef?: string;
  readonly processOwner?: string;
  readonly networkPolicy?: IdentityProfile["networkPolicy"];
  readonly toolPolicyRef?: string;
}

export interface IdentityProfileDiagnostics {
  readonly code: string;
  readonly metadata: Record<string, MetadataOnlyValue>;
}

export interface IdentityProfilePreflightResult {
  readonly profile: IdentityProfile;
  readonly environment: ResolvedProfileEnvironment;
  readonly readiness: IdentityProfileReadiness;
  readonly allowed: boolean;
  readonly diagnostics: IdentityProfileDiagnostics;
  readonly failure?: RuntimeFailure;
  readonly status: IdentityProfileStatus;
}

export interface SharedHttpIsolationEvidence {
  readonly schema: "shared_http_identity_isolation.v0.1";
  readonly perSessionHome: boolean;
  readonly perSessionEnv: boolean;
  readonly perSessionCredentials: boolean;
  readonly perSessionAuthVolume: boolean;
  readonly source: "contract_freeze" | "operator_attestation" | "test_fixture";
}

export interface OmnigentProcessProfile {
  readonly schema: "omnigent_process_profile.v0.1";
  readonly profileId: string;
  readonly provider: IdentityProfile["provider"];
  readonly harness: IdentityProfile["harness"];
  readonly providerMode: OmnigentProviderMode;
  readonly homeDirRef?: string;
  readonly authVolumeRef?: string;
  readonly processOwner?: string;
  readonly networkPolicy?: IdentityProfile["networkPolicy"];
  readonly toolPolicyRef?: string;
  readonly launchEnvKeys: string[];
  readonly secretRefKeys: string[];
  readonly isolationEvidence:
    | "per_profile_process"
    | "shared_http_session_isolation";
}

export interface OmnigentIsolationDecision {
  readonly schema: "omnigent_identity_isolation_decision.v0.1";
  readonly providerMode: OmnigentProviderMode;
  readonly launchStrategy:
    | "shared_http_allowed"
    | "per_profile_process"
    | "blocked_shared_http";
  readonly sharedModeAllowed: boolean;
  readonly allowed: boolean;
  readonly reason: string;
  readonly processProfiles: OmnigentProcessProfile[];
  readonly evidence?: SharedHttpIsolationEvidence;
}

export class IdentityIsolationError extends Error {
  readonly code: string;

  readonly diagnostics: Record<string, MetadataOnlyValue>;

  constructor(
    code: string,
    message: string,
    diagnostics: Record<string, MetadataOnlyValue> = {},
  ) {
    super(message);
    this.name = "IdentityIsolationError";
    this.code = code;
    this.diagnostics = diagnostics;
  }
}

export function detectIdentityProfileKind(
  profile: IdentityProfile,
): IdentityProfileKind {
  const tags = new Set((profile.tags ?? []).map((tag) => tag.toLowerCase()));
  if (tags.has("development")) {
    return "development";
  }
  if (tags.has("shared")) {
    return "shared";
  }
  return "production";
}

export function createIdentityDiagnostics(
  code: string,
  metadata: Record<string, MetadataOnlyValue>,
): IdentityProfileDiagnostics {
  return {
    code,
    metadata,
  };
}

export function createIdentityFailure(options: {
  readonly code: string;
  readonly message: string;
  readonly category: RuntimeFailureCategory;
  readonly actor: RuntimeFailureActor;
  readonly scope: RuntimeFailureScope;
  readonly retryable?: boolean;
  readonly retryAfterSeconds?: number;
  readonly resetAt?: string;
  readonly diagnostics?: Record<string, MetadataOnlyValue>;
}): RuntimeFailure {
  return createRuntimeFailure({
    category: options.category,
    retryable: options.retryable ?? false,
    actor: options.actor,
    scope: options.scope,
    message: options.message,
    retryAfterSeconds: options.retryAfterSeconds,
    resetAt: options.resetAt,
    safeDiagnostics: {
      code: options.code,
      ...(options.diagnostics ?? {}),
    },
  });
}

export function mapReadinessToLedgerStatus(
  readiness: IdentityProfileReadiness,
): IdentityProfileStatus["status"] {
  if (readiness === "needs_auth") {
    return "blocked";
  }
  return readiness;
}

export function createIdentityProfileStatus(
  profile: IdentityProfile,
  options: {
    readonly readiness: IdentityProfileReadiness;
    readonly checkedAt: string;
    readonly activeSessions: number;
    readonly activeTurns: number;
    readonly reason?: string;
    readonly cooldown?: IdentityProfileStatus["cooldown"];
  },
): IdentityProfileStatus {
  return {
    schema: "identity_profile_status.v0.1",
    profileId: profile.id,
    provider: profile.provider,
    harness: profile.harness,
    status: mapReadinessToLedgerStatus(options.readiness),
    checkedAt: options.checkedAt,
    activeSessions: options.activeSessions,
    activeTurns: options.activeTurns,
    reason: options.reason,
    cooldown: options.cooldown,
  };
}
