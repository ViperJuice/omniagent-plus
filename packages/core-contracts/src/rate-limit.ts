import { z } from "zod";

export const limitTypes = [
  "none",
  "burst_rate_limit",
  "token_rate_limit",
  "concurrency_limit",
  "fixed_window_usage_cap",
  "monthly_spend_or_quota_cap",
  "acceleration_limit",
  "overload_or_transient",
  "auth_or_billing_problem",
  "abuse_or_policy_block",
  "unknown_limit",
] as const;
export type LimitType = (typeof limitTypes)[number];

export const limitScopes = [
  "session",
  "identity_profile",
  "provider_family",
  "model",
  "project",
  "organization",
  "global",
  "unknown",
] as const;
export type LimitScope = (typeof limitScopes)[number];

export interface LimitClassification {
  readonly schema: "limit_classification.v0.1";
  readonly type: LimitType;
  readonly scope: LimitScope;
  readonly confidence: number;
  readonly provider?: string;
  readonly harness?: string;
  readonly identityProfileId?: string;
  readonly sessionId?: string;
  readonly retryAfterSeconds?: number;
  readonly resetAt?: string;
  readonly rawSignal: {
    readonly statusCode?: number;
    readonly exitCode?: number;
    readonly stderrExcerpt?: string;
    readonly stdoutExcerpt?: string;
    readonly headers?: Record<string, string>;
  };
  readonly routingAction: {
    readonly retrySameSession: boolean;
    readonly reduceConcurrency: boolean;
    readonly routeNewWorkElsewhere: boolean;
    readonly migrateExistingPortableWork: boolean;
    readonly requireManualReview: boolean;
    readonly sameProviderAccountSwitch:
      | "forbidden"
      | "manual_confirmation_required"
      | "allowed_by_policy";
  };
  readonly notes?: string[];
}

export const limitClassificationSchema = z.object({
  schema: z.literal("limit_classification.v0.1"),
  type: z.enum(limitTypes),
  scope: z.enum(limitScopes),
  confidence: z.number().min(0).max(1),
  provider: z.string().min(1).optional(),
  harness: z.string().min(1).optional(),
  identityProfileId: z.string().min(1).optional(),
  sessionId: z.string().min(1).optional(),
  retryAfterSeconds: z.number().int().nonnegative().optional(),
  resetAt: z.string().datetime({ offset: true }).optional(),
  rawSignal: z.object({
    statusCode: z.number().int().nonnegative().optional(),
    exitCode: z.number().int().optional(),
    stderrExcerpt: z.string().min(1).optional(),
    stdoutExcerpt: z.string().min(1).optional(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
  routingAction: z.object({
    retrySameSession: z.boolean(),
    reduceConcurrency: z.boolean(),
    routeNewWorkElsewhere: z.boolean(),
    migrateExistingPortableWork: z.boolean(),
    requireManualReview: z.boolean(),
    sameProviderAccountSwitch: z.enum([
      "forbidden",
      "manual_confirmation_required",
      "allowed_by_policy",
    ]),
  }),
  notes: z.array(z.string().min(1)).optional(),
});
