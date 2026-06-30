import { z } from "zod";

import { runtimeEvidenceRefSchema } from "./redaction.js";

export const runtimeFailureCategories = [
  "validation",
  "transport",
  "protocol",
  "auth",
  "billing",
  "rate_limit",
  "concurrency_limit",
  "policy_denied",
  "approval_required",
  "approval_denied",
  "timeout",
  "cancelled",
  "harness_unavailable",
  "backend_unavailable",
  "backend_version_mismatch",
  "backend_capability_missing",
  "sandbox_denied",
  "malformed_response",
  "state_conflict",
  "internal",
] as const;
export type RuntimeFailureCategory = (typeof runtimeFailureCategories)[number];

export const runtimeFailureActors = [
  "caller",
  "provider",
  "harness",
  "omnigent",
  "network",
  "policy",
  "unknown",
] as const;
export type RuntimeFailureActor = (typeof runtimeFailureActors)[number];

export const runtimeFailureScopes = [
  "request",
  "turn",
  "session",
  "identity_profile",
  "provider_family",
  "worktree",
  "system",
] as const;
export type RuntimeFailureScope = (typeof runtimeFailureScopes)[number];

export interface RuntimeFailure {
  readonly schema: "runtime_failure.v0.1";
  readonly category: RuntimeFailureCategory;
  readonly retryable: boolean;
  readonly actor: RuntimeFailureActor;
  readonly scope: RuntimeFailureScope;
  readonly message: string;
  readonly retryAfterSeconds?: number;
  readonly resetAt?: string;
  readonly safeDiagnostics?: Record<string, unknown>;
  readonly evidenceRefs?: Array<z.infer<typeof runtimeEvidenceRefSchema>>;
  readonly causeChain?: RuntimeFailure[];
}

export const runtimeFailureSchema: z.ZodType<RuntimeFailure> = z.lazy(() =>
  z.object({
    schema: z.literal("runtime_failure.v0.1"),
    category: z.enum(runtimeFailureCategories),
    retryable: z.boolean(),
    actor: z.enum(runtimeFailureActors),
    scope: z.enum(runtimeFailureScopes),
    message: z.string().min(1),
    retryAfterSeconds: z.number().int().nonnegative().optional(),
    resetAt: z.string().datetime({ offset: true }).optional(),
    safeDiagnostics: z.record(z.string(), z.unknown()).optional(),
    evidenceRefs: z.array(runtimeEvidenceRefSchema).optional(),
    causeChain: z.array(runtimeFailureSchema).optional(),
  }),
);

export function createRuntimeFailure(
  failure: Omit<RuntimeFailure, "schema">,
): RuntimeFailure {
  return {
    schema: "runtime_failure.v0.1",
    ...failure,
  };
}

export function isRuntimeFailure(value: unknown): value is RuntimeFailure {
  return runtimeFailureSchema.safeParse(value).success;
}
