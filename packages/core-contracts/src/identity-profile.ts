import { z } from "zod";

import { harnessIds, providerFamilyIds } from "./types.js";
import {
  redactedConfigValueSchema,
  type RedactedConfigValue,
} from "./redaction.js";

export interface SecretRef {
  readonly provider: "onepassword" | "env" | "file" | "custom";
  readonly key: string;
  readonly field?: string;
}

export interface CooldownState {
  readonly active: boolean;
  readonly reason: string;
  readonly resetAt?: string;
}

export interface IdentityProfile {
  readonly id: string;
  readonly provider: (typeof providerFamilyIds)[number];
  readonly harness: (typeof harnessIds)[number];
  readonly authMode:
    | "local_subscription"
    | "api_key"
    | "oauth"
    | "vertex"
    | "service_account"
    | "none";
  readonly isolation:
    | "host_env"
    | "isolated_home"
    | "unix_user"
    | "container"
    | "vm";
  readonly secretRefs?: SecretRef[];
  readonly envAllowlist?: string[];
  readonly env?: Record<string, RedactedConfigValue>;
  readonly authVolumeRef?: string;
  readonly homeDir?: string;
  readonly processOwner?: string;
  readonly networkPolicy?: "host" | "restricted" | "disabled";
  readonly toolPolicyRef?: string;
  readonly maxOpenSessions: number;
  readonly maxActiveTurns: number;
  readonly maxActiveToolCalls?: number;
  readonly providerFamilyCooldown?: CooldownState;
  readonly identityCooldown?: CooldownState;
  readonly tags?: string[];
}

export const secretRefSchema = z.object({
  provider: z.enum(["onepassword", "env", "file", "custom"]),
  key: z.string().min(1),
  field: z.string().min(1).optional(),
});

export const cooldownStateSchema = z.object({
  active: z.boolean(),
  reason: z.string().min(1),
  resetAt: z.string().datetime({ offset: true }).optional(),
});

export const identityProfileSchema = z.object({
  id: z.string().min(1),
  provider: z.enum(providerFamilyIds),
  harness: z.enum(harnessIds),
  authMode: z.enum([
    "local_subscription",
    "api_key",
    "oauth",
    "vertex",
    "service_account",
    "none",
  ]),
  isolation: z.enum([
    "host_env",
    "isolated_home",
    "unix_user",
    "container",
    "vm",
  ]),
  secretRefs: z.array(secretRefSchema).optional(),
  envAllowlist: z.array(z.string().min(1)).optional(),
  env: z.record(z.string(), redactedConfigValueSchema).optional(),
  authVolumeRef: z.string().min(1).optional(),
  homeDir: z.string().min(1).optional(),
  processOwner: z.string().min(1).optional(),
  networkPolicy: z.enum(["host", "restricted", "disabled"]).optional(),
  toolPolicyRef: z.string().min(1).optional(),
  maxOpenSessions: z.number().int().nonnegative(),
  maxActiveTurns: z.number().int().nonnegative(),
  maxActiveToolCalls: z.number().int().nonnegative().optional(),
  providerFamilyCooldown: cooldownStateSchema.optional(),
  identityCooldown: cooldownStateSchema.optional(),
  tags: z.array(z.string().min(1)).optional(),
});
