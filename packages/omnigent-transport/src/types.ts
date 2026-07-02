import type {
  AgentSessionState,
  CreateSessionRequest,
  ProviderHealth,
  RuntimeFailureCategory,
  SendTurnRequest,
  TurnHandle,
} from "@omniagent-plus/core-contracts";

export const omnigentProviderModes = ["http", "cli", "hybrid"] as const;
export type OmnigentProviderMode = (typeof omnigentProviderModes)[number];

export const omnigentCapabilityStatuses = [
  "supported",
  "emulated",
  "blocked",
] as const;
export type OmnigentCapabilityStatus =
  (typeof omnigentCapabilityStatuses)[number];

export const omnigentSessionStatuses = [
  "idle",
  "launching",
  "running",
  "waiting",
  "failed",
] as const;
export type OmnigentSessionStatus = (typeof omnigentSessionStatuses)[number];

export const omnigentResponseStatuses = [
  "queued",
  "in_progress",
  "completed",
  "failed",
  "incomplete",
  "cancelled",
] as const;
export type OmnigentResponseStatus =
  (typeof omnigentResponseStatuses)[number];

export const omnigentStreamEventTypes = [
  "session.created",
  "session.status",
  "session.input.consumed",
  "session.interrupted",
  "session.child_session.updated",
  "response.created",
  "response.queued",
  "response.in_progress",
  "response.output_text.delta",
  "response.completed",
  "response.failed",
  "response.incomplete",
  "response.cancelled",
  "turn.started",
  "turn.completed",
  "turn.failed",
  "turn.cancelled",
] as const;
export type OmnigentStreamEventType =
  (typeof omnigentStreamEventTypes)[number];

export interface OmnigentHttpClientOptions {
  readonly baseUrl: string;
  readonly headers?: Record<string, string>;
  readonly fetch?: typeof globalThis.fetch;
}

export interface OmnigentCommandOptions {
  readonly cwd?: string;
  readonly env?: Record<string, string | undefined>;
  readonly input?: string;
  readonly timeoutMs?: number;
}

export interface OmnigentCliCommandResult {
  readonly command: readonly string[];
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly signal?: NodeJS.Signals | null;
}

export type OmnigentCliCommandRunner = (
  command: readonly string[],
  options?: OmnigentCommandOptions,
) => Promise<OmnigentCliCommandResult>;

export interface OmnigentSessionSnapshot {
  readonly id: string;
  readonly title: string;
  readonly status: OmnigentSessionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly backend: `omnigent-${OmnigentProviderMode}`;
  readonly items: OmnigentHistoryItem[];
  readonly activeTurnId?: string;
  readonly backgroundTaskCount?: number | null;
  readonly background_task_count?: number | null;
  readonly metadata?: Record<string, unknown>;
  readonly viewerLastSeen?: number | null;
  readonly viewerUnread?: boolean;
  readonly viewer_last_seen?: number | null;
  readonly viewer_unread?: boolean;
}

export interface OmnigentEventFailure {
  readonly category?: RuntimeFailureCategory;
  readonly message: string;
  readonly statusCode?: number;
  readonly retryAfterSeconds?: number;
  readonly resetAt?: string;
}

export interface OmnigentRawEvent {
  readonly id: string;
  readonly type: OmnigentStreamEventType | "[DONE]";
  readonly sessionId: string;
  readonly turnId?: string;
  readonly occurredAt: string;
  readonly backgroundTaskCount?: number | null;
  readonly background_task_count?: number | null;
  readonly itemId?: string;
  readonly terminal?: boolean;
  readonly status?: OmnigentSessionStatus | OmnigentResponseStatus;
  readonly reason?: string;
  readonly message?: string;
  readonly delta?: string;
  readonly outputText?: string;
  readonly failure?: OmnigentEventFailure;
}

export interface OmnigentReadStateInput {
  readonly lastSeen: number;
  readonly unread: boolean;
}

export interface OmnigentHistoryItem {
  readonly id: string;
  readonly event: OmnigentRawEvent;
}

export interface OmnigentEventAck {
  readonly queued: boolean;
  readonly sessionId: string;
  readonly turnId: string;
}

export type OmnigentSendEventType =
  | "message"
  | "interrupt"
  | "compact"
  | "stop_session";

export interface OmnigentSendEventInput {
  readonly type: OmnigentSendEventType;
  readonly data: Record<string, unknown>;
}

export interface OmnigentServerStatus {
  readonly running: boolean;
  readonly baseUrl?: string;
  readonly pid?: number;
  readonly notes?: string[];
  readonly version?: string;
}

export interface OmnigentCliSessionTransport {
  createSession(request: CreateSessionRequest): Promise<OmnigentSessionSnapshot>;
  sendTurn(
    request: SendTurnRequest,
    session: OmnigentSessionSnapshot,
  ): Promise<{
    handle: TurnHandle;
    rawEvents?: OmnigentRawEvent[];
  }>;
  readHistory(sessionId: string): Promise<OmnigentHistoryItem[]>;
  streamEvents(sessionId: string): Promise<OmnigentRawEvent[]>;
  cancelTurn(handle: TurnHandle): Promise<TurnHandle>;
  closeSession(sessionId: string): Promise<void>;
  getSessionInfo(
    sessionId: string,
  ): Promise<{
    session: OmnigentSessionSnapshot;
    state: AgentSessionState;
  }>;
  health(): Promise<ProviderHealth>;
  serverStatus?(): Promise<OmnigentServerStatus>;
  serverStart?(): Promise<OmnigentServerStatus>;
  serverStop?(): Promise<void>;
}
