import type { RuntimeEvent } from "./events.js";
import type { RuntimeFailure } from "./errors.js";
import type { HandoffPacket } from "./handoff-packet.js";
import type { AgentSessionState, TurnState } from "./state-machines.js";
import type { WorktreeLeaseRef } from "./worktree.js";

export const runtimeIds = ["omnigent"] as const;
export type RuntimeId = (typeof runtimeIds)[number];

export const harnessIds = [
  "claude-code",
  "codex",
  "gemini-antigravity",
  "opencode",
  "pi",
  "custom",
] as const;
export type HarnessId = (typeof harnessIds)[number];

export const providerFamilyIds = [
  "anthropic",
  "openai",
  "google",
  "zai",
  "minimax",
  "local",
  "custom",
] as const;
export type ProviderFamilyId = (typeof providerFamilyIds)[number];

export const backendIds = [
  "omnigent-http",
  "omnigent-cli",
  "omnigent-hybrid",
] as const;
export type BackendId = (typeof backendIds)[number];

export const cancellationReasons = [
  "user_request",
  "approval_denied",
  "timeout",
  "provider_interrupt",
  "session_close",
] as const;
export type CancellationReason = (typeof cancellationReasons)[number];

export interface RuntimeFileRef {
  readonly path: string;
  readonly description?: string;
  readonly redaction: "metadata_only" | "content_allowed" | "content_redacted";
}

export interface RuntimeRetryPolicy {
  readonly maxAttempts: number;
  readonly backoffMs: number;
  readonly retryOn: string[];
}

export interface HistoryOptions {
  readonly afterSequence?: number;
  readonly limit?: number;
}

export interface StreamOptions {
  readonly afterSequence?: number;
  readonly includeHeartbeats?: boolean;
}

export interface ProviderHealth {
  readonly runtime: RuntimeId;
  readonly backend: BackendId;
  readonly available: boolean;
  readonly activeSessions: number;
  readonly sessionStateDrift: string[];
  readonly notes?: string[];
}

export interface OmnigentAgentSpecRef {
  readonly kind: "bundle_path" | "named_agent" | "inline_spec";
  readonly value: string;
  readonly version?: string;
}

export interface CreateSessionRequest {
  readonly runtime: RuntimeId;
  readonly targetHarness: HarnessId;
  readonly idempotencyKey: string;
  readonly correlationId?: string;
  readonly targetProvider?: ProviderFamilyId;
  readonly identityProfileId?: string;
  readonly title: string;
  readonly repoRoot?: string;
  readonly worktree?: WorktreeLeaseRef;
  readonly agentSpec?: OmnigentAgentSpecRef;
  readonly initialMessage?: string;
  readonly handoffPacket?: HandoffPacket;
  readonly metadata?: Record<string, unknown>;
}

export interface SendTurnRequest {
  readonly sessionId: string;
  readonly turnId?: string;
  readonly idempotencyKey: string;
  readonly correlationId?: string;
  readonly message: string;
  readonly handoffPacket?: HandoffPacket;
  readonly files?: RuntimeFileRef[];
  readonly timeoutMs?: number;
  readonly retryPolicy?: RuntimeRetryPolicy;
  readonly metadata?: Record<string, unknown>;
}

export interface AgentSession {
  readonly id: string;
  readonly runtime: RuntimeId;
  readonly targetHarness: HarnessId;
  readonly targetProvider?: ProviderFamilyId;
  readonly identityProfileId?: string;
  readonly title: string;
  readonly state: AgentSessionState;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly correlationId?: string;
  readonly repoRoot?: string;
  readonly parentSessionId?: string;
  readonly rootSessionId?: string;
  readonly worktree?: WorktreeLeaseRef;
  readonly handoffPacket?: HandoffPacket;
  readonly metadata?: Record<string, unknown>;
}

export interface AgentSessionInfo extends AgentSession {
  readonly activeTurnId?: string;
  readonly eventCursor: number;
  readonly lastError?: RuntimeFailure;
}

export interface SessionHistory {
  readonly sessionId: string;
  readonly events: RuntimeEvent[];
  readonly nextCursor?: number;
}

export interface TurnHandle {
  readonly sessionId: string;
  readonly turnId: string;
  readonly idempotencyKey: string;
  readonly state: TurnState;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly eventCursor?: number;
}
