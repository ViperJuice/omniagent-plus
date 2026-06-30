import type { IdentityProfile } from "@omniagent-plus/core-contracts";

import {
  buildProfileEnvironment,
  describeProfileEnvironment,
  type BuildProfileEnvironmentOptions,
} from "./environment.js";
import {
  createIdentityDiagnostics,
  createIdentityFailure,
  createIdentityProfileStatus,
  IdentityIsolationError,
  type MetadataOnlyValue,
  type IdentityProfilePreflightResult,
  type IdentityProfileReadiness,
} from "./types.js";

export interface PreflightIdentityProfileOptions
  extends BuildProfileEnvironmentOptions {
  readonly activeSessions?: number;
  readonly activeTurns?: number;
  readonly authAvailable?: boolean;
  readonly blockedReason?: string;
  readonly checkedAt?: string;
}

function buildResult(
  profile: IdentityProfile,
  readiness: IdentityProfileReadiness,
  options: {
    readonly environment: ReturnType<typeof describeProfileEnvironment>;
    readonly checkedAt: string;
    readonly activeSessions: number;
    readonly activeTurns: number;
    readonly reason?: string;
    readonly failure?: ReturnType<typeof createIdentityFailure>;
    readonly code: string;
    readonly extraDiagnostics?: Record<string, MetadataOnlyValue>;
    readonly cooldown?: ReturnType<typeof createIdentityProfileStatus>["cooldown"];
  },
): IdentityProfilePreflightResult {
  const diagnostics = createIdentityDiagnostics(options.code, {
    profileId: profile.id,
    profileKind: options.environment.kind,
    isolation: profile.isolation,
    envAllowlistCount: options.environment.envAllowlist.length,
    launchEnvKeys: options.environment.launchEnvKeys,
    secretRefCount: options.environment.secretRefs.length,
    authVolumeRefPresent: options.environment.authVolumeRef !== undefined,
    activeSessions: options.activeSessions,
    activeTurns: options.activeTurns,
    ...(options.extraDiagnostics ?? {}),
  });

  return {
    profile,
    environment: options.environment,
    readiness,
    allowed: readiness === "ready",
    diagnostics,
    failure: options.failure,
    status: createIdentityProfileStatus(profile, {
      readiness,
      checkedAt: options.checkedAt,
      activeSessions: options.activeSessions,
      activeTurns: options.activeTurns,
      reason: options.reason,
      cooldown: options.cooldown,
    }),
  };
}

export function preflightIdentityProfile(
  profile: IdentityProfile,
  options: PreflightIdentityProfileOptions = {},
): IdentityProfilePreflightResult {
  const activeSessions = options.activeSessions ?? 0;
  const activeTurns = options.activeTurns ?? 0;
  const checkedAt = options.checkedAt ?? new Date().toISOString();
  const environment = describeProfileEnvironment(profile, options);

  try {
    buildProfileEnvironment(profile, options);
  } catch (error) {
    if (error instanceof IdentityIsolationError) {
      return buildResult(profile, "blocked", {
        environment,
        checkedAt,
        activeSessions,
        activeTurns,
        reason: error.code,
        code: error.code,
        extraDiagnostics: error.diagnostics,
        failure: createIdentityFailure({
          code: error.code,
          message: error.message,
          category: "policy_denied",
          actor: "policy",
          scope: "identity_profile",
          diagnostics: error.diagnostics,
        }),
      });
    }
    throw error;
  }

  if ((options.blockedReason ?? "").length > 0) {
    return buildResult(profile, "blocked", {
      environment,
      checkedAt,
      activeSessions,
      activeTurns,
      reason: options.blockedReason,
      code: "manual_block",
      failure: createIdentityFailure({
        code: "manual_block",
        message: options.blockedReason!,
        category: "policy_denied",
        actor: "policy",
        scope: "identity_profile",
      }),
    });
  }

  const cooldown =
    profile.identityCooldown?.active === true
      ? profile.identityCooldown
      : profile.providerFamilyCooldown?.active === true
        ? profile.providerFamilyCooldown
        : undefined;

  if (cooldown?.active === true) {
    return buildResult(profile, "cooldown", {
      environment,
      checkedAt,
      activeSessions,
      activeTurns,
      reason: cooldown.reason,
      code: "cooldown_active",
      cooldown,
      extraDiagnostics: {
        resetAt: cooldown.resetAt,
      },
      failure: createIdentityFailure({
        code: "cooldown_active",
        message: cooldown.reason,
        category: "rate_limit",
        actor: "provider",
        scope:
          profile.identityCooldown?.active === true
            ? "identity_profile"
            : "provider_family",
        retryable: true,
        resetAt: cooldown.resetAt,
      }),
    });
  }

  if (profile.authMode !== "none" && options.authAvailable === false) {
    return buildResult(profile, "needs_auth", {
      environment,
      checkedAt,
      activeSessions,
      activeTurns,
      reason: "needs_auth",
      code: "needs_auth",
      failure: createIdentityFailure({
        code: "needs_auth",
        message: "Identity profile requires an authenticated secret ref before use.",
        category: "auth",
        actor: "provider",
        scope: "identity_profile",
      }),
    });
  }

  if (
    activeSessions > profile.maxOpenSessions ||
    activeTurns > profile.maxActiveTurns
  ) {
    return buildResult(profile, "degraded", {
      environment,
      checkedAt,
      activeSessions,
      activeTurns,
      reason: "concurrency_bounds_exceeded",
      code: "concurrency_bounds_exceeded",
      failure: createIdentityFailure({
        code: "concurrency_bounds_exceeded",
        message: "Identity profile exceeded its bounded session or turn limits.",
        category: "concurrency_limit",
        actor: "policy",
        scope: "identity_profile",
        retryable: true,
      }),
    });
  }

  return buildResult(profile, "ready", {
    environment,
    checkedAt,
    activeSessions,
    activeTurns,
    code: "ready",
  });
}
