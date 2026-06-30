import { z } from "zod";

import { runtimeEvidenceRefSchema } from "./redaction.js";

export interface RouteDecision {
  readonly schema: "route_decision.v0.1";
  readonly taskId: string;
  readonly selectedProvider: string;
  readonly selectedHarness: string;
  readonly selectedIdentityProfileId?: string;
  readonly preferredProvider?: string;
  readonly preferredHarness?: string;
  readonly fallbackUsed: boolean;
  readonly fallbackReason?: string;
  readonly capabilityFit: number;
  readonly providerHealth: number;
  readonly currentCapacity: number;
  readonly contextPortability: "low" | "medium" | "high";
  readonly routeReason:
    | "explicit_override"
    | "capability_fit"
    | "load_balance"
    | "provider_cooldown"
    | "usage_cap"
    | "transient_failure"
    | "manual";
  readonly silentDowngrade: false;
  readonly evidenceRefs?: Array<z.infer<typeof runtimeEvidenceRefSchema>>;
}

export const routeDecisionSchema = z.object({
  schema: z.literal("route_decision.v0.1"),
  taskId: z.string().min(1),
  selectedProvider: z.string().min(1),
  selectedHarness: z.string().min(1),
  selectedIdentityProfileId: z.string().min(1).optional(),
  preferredProvider: z.string().min(1).optional(),
  preferredHarness: z.string().min(1).optional(),
  fallbackUsed: z.boolean(),
  fallbackReason: z.string().min(1).optional(),
  capabilityFit: z.number().min(0).max(1),
  providerHealth: z.number().min(0).max(1),
  currentCapacity: z.number().min(0).max(1),
  contextPortability: z.enum(["low", "medium", "high"]),
  routeReason: z.enum([
    "explicit_override",
    "capability_fit",
    "load_balance",
    "provider_cooldown",
    "usage_cap",
    "transient_failure",
    "manual",
  ]),
  silentDowngrade: z.literal(false),
  evidenceRefs: z.array(runtimeEvidenceRefSchema).optional(),
});
