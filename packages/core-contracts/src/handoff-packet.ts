import { z } from "zod";

export interface CommandEvidence {
  readonly command: string;
  readonly exitCode: number;
  readonly summary: string;
}

export interface TestEvidence {
  readonly name: string;
  readonly status: "passed" | "failed" | "skipped";
  readonly summary?: string;
}

export interface DiffEvidence {
  readonly path: string;
  readonly summary: string;
}

export interface LogEvidence {
  readonly path: string;
  readonly summary: string;
}

export interface HandoffPacket {
  readonly schema: "handoff_packet.v0.1";
  readonly packetId: string;
  readonly createdAt: string;
  readonly sourceSessionIds: string[];
  readonly sourceHarnesses: string[];
  readonly targetHarness?: string;
  readonly targetProvider?: string;
  readonly reason:
    | "manual_handoff"
    | "provider_rate_limit"
    | "provider_usage_cap"
    | "provider_outage"
    | "session_continuation"
    | "review"
    | "debug"
    | "failover"
    | "routing_policy";
  readonly objective: string;
  readonly currentStatus:
    | "not_started"
    | "in_progress"
    | "blocked"
    | "complete"
    | "failed"
    | "unknown";
  readonly taskContract?: {
    readonly must?: string[];
    readonly mustNot?: string[];
    readonly acceptanceCriteria?: string[];
    readonly constraints?: string[];
  };
  readonly workspace?: {
    readonly repoRoot?: string;
    readonly branch?: string;
    readonly worktreePath?: string;
    readonly baseRef?: string;
    readonly diffRef?: string;
  };
  readonly evidence: {
    readonly changedFiles?: string[];
    readonly inspectedFiles?: string[];
    readonly commandsRun?: CommandEvidence[];
    readonly testResults?: TestEvidence[];
    readonly diffs?: DiffEvidence[];
    readonly logs?: LogEvidence[];
  };
  readonly decisions?: string[];
  readonly assumptions?: string[];
  readonly failedAttempts?: string[];
  readonly risks?: string[];
  readonly openQuestions?: string[];
  readonly nextRecommendedAction?: string;
  readonly contextPolicy: {
    readonly rawHistoryAllowed: boolean;
    readonly rawHistoryMaxItems?: number;
    readonly mayEditFiles: boolean;
    readonly mayRunCommands: boolean;
    readonly mayUseNetwork: boolean;
    readonly maySwitchProvider: boolean;
  };
  readonly requiredOutput?: {
    readonly schema?: string;
    readonly instructions?: string;
  };
}

export const commandEvidenceSchema = z.object({
  command: z.string().min(1),
  exitCode: z.number().int(),
  summary: z.string().min(1),
});

export const testEvidenceSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["passed", "failed", "skipped"]),
  summary: z.string().min(1).optional(),
});

export const diffEvidenceSchema = z.object({
  path: z.string().min(1),
  summary: z.string().min(1),
});

export const logEvidenceSchema = z.object({
  path: z.string().min(1),
  summary: z.string().min(1),
});

export const handoffPacketSchema = z.object({
  schema: z.literal("handoff_packet.v0.1"),
  packetId: z.string().min(1),
  createdAt: z.string().datetime({ offset: true }),
  sourceSessionIds: z.array(z.string().min(1)).min(1),
  sourceHarnesses: z.array(z.string().min(1)).min(1),
  targetHarness: z.string().min(1).optional(),
  targetProvider: z.string().min(1).optional(),
  reason: z.enum([
    "manual_handoff",
    "provider_rate_limit",
    "provider_usage_cap",
    "provider_outage",
    "session_continuation",
    "review",
    "debug",
    "failover",
    "routing_policy",
  ]),
  objective: z.string().min(1),
  currentStatus: z.enum([
    "not_started",
    "in_progress",
    "blocked",
    "complete",
    "failed",
    "unknown",
  ]),
  taskContract: z
    .object({
      must: z.array(z.string().min(1)).optional(),
      mustNot: z.array(z.string().min(1)).optional(),
      acceptanceCriteria: z.array(z.string().min(1)).optional(),
      constraints: z.array(z.string().min(1)).optional(),
    })
    .optional(),
  workspace: z
    .object({
      repoRoot: z.string().min(1).optional(),
      branch: z.string().min(1).optional(),
      worktreePath: z.string().min(1).optional(),
      baseRef: z.string().min(1).optional(),
      diffRef: z.string().min(1).optional(),
    })
    .optional(),
  evidence: z.object({
    changedFiles: z.array(z.string().min(1)).optional(),
    inspectedFiles: z.array(z.string().min(1)).optional(),
    commandsRun: z.array(commandEvidenceSchema).optional(),
    testResults: z.array(testEvidenceSchema).optional(),
    diffs: z.array(diffEvidenceSchema).optional(),
    logs: z.array(logEvidenceSchema).optional(),
  }),
  decisions: z.array(z.string().min(1)).optional(),
  assumptions: z.array(z.string().min(1)).optional(),
  failedAttempts: z.array(z.string().min(1)).optional(),
  risks: z.array(z.string().min(1)).optional(),
  openQuestions: z.array(z.string().min(1)).optional(),
  nextRecommendedAction: z.string().min(1).optional(),
  contextPolicy: z.object({
    rawHistoryAllowed: z.boolean(),
    rawHistoryMaxItems: z.number().int().positive().optional(),
    mayEditFiles: z.boolean(),
    mayRunCommands: z.boolean(),
    mayUseNetwork: z.boolean(),
    maySwitchProvider: z.boolean(),
  }),
  requiredOutput: z
    .object({
      schema: z.string().min(1).optional(),
      instructions: z.string().min(1).optional(),
    })
    .optional(),
});
