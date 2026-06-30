import type { RuntimeEvent } from "./events.js";
import type {
  AgentSession,
  AgentSessionInfo,
  CancellationReason,
  CreateSessionRequest,
  HistoryOptions,
  ProviderHealth,
  SendTurnRequest,
  SessionHistory,
  StreamOptions,
  TurnHandle,
} from "./types.js";

export interface AgentRuntimeProvider {
  createSession(request: CreateSessionRequest): Promise<AgentSession>;
  sendTurn(request: SendTurnRequest): Promise<TurnHandle>;
  readHistory(
    sessionId: string,
    options?: HistoryOptions,
  ): Promise<SessionHistory>;
  streamEvents(
    sessionId: string,
    options?: StreamOptions,
  ): AsyncIterable<RuntimeEvent>;
  cancelTurn(
    handle: TurnHandle,
    reason?: CancellationReason,
  ): Promise<TurnHandle>;
  closeSession(sessionId: string): Promise<void>;
  getSessionInfo(sessionId: string): Promise<AgentSessionInfo>;
  health(): Promise<ProviderHealth>;
}
