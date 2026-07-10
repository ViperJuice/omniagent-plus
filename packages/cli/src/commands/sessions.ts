import type { AgentSession, RuntimeEvent, TurnHandle } from "@consiliency/runtime-provider";
import { AuditLedger, replaySessionHistory } from "@omniagent-plus/state-ledger";

import { createCliError } from "../errors.js";
import type {
  ParsedCliRequest,
  ParsedSessionsListRequest,
  ParsedSessionsShowRequest,
} from "../args.js";
import {
  sessionsListResultSchema,
  sessionsShowResultSchema,
} from "../types.js";

function sessionSummary(
  session: AgentSession,
  records: Awaited<ReturnType<AuditLedger["listSessionRecords"]>>,
) {
  return {
    id: session.id,
    runtime: session.runtime,
    targetHarness: session.targetHarness,
    targetProvider: session.targetProvider,
    identityProfileId: session.identityProfileId,
    title: session.title,
    state: session.state,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    repoRoot: session.repoRoot,
    turnCount: records.filter((record) => record.kind === "turn").length,
    eventCount: records.filter((record) => record.kind === "runtime_event").length,
    approvalRequestCount: records.filter((record) => record.kind === "approval_request").length,
    approvalResponseCount: records.filter((record) => record.kind === "approval_response").length,
    evidenceRefCount: records.filter((record) => record.kind === "evidence_ref").length,
  };
}

async function runSessionsList(
  request: ParsedSessionsListRequest,
) {
  const ledger = await AuditLedger.open({
    rootDir: request.stateRoot,
  });
  const sessions = await ledger.listRecordsByKind("session");
  const sorted = [...sessions].sort((left, right) =>
    ((left.payload as AgentSession).id).localeCompare((right.payload as AgentSession).id),
  );
  const limited = request.limit === undefined
    ? sorted
    : sorted.slice(0, request.limit);

  const results = await Promise.all(
    limited.map(async (record) => {
      const session = record.payload as AgentSession;
      return sessionSummary(session, await ledger.listSessionRecords(session.id));
    }),
  );

  return sessionsListResultSchema.parse({
    schema: "cli.sessions.list.result.v0.1",
    count: results.length,
    sessions: results,
  });
}

async function runSessionsShow(
  request: ParsedSessionsShowRequest,
) {
  const ledger = await AuditLedger.open({
    rootDir: request.stateRoot,
  });
  const records = await ledger.listSessionRecords(request.sessionId);
  const session = records.find((record) => record.kind === "session")
    ?.payload as AgentSession | undefined;

  if (session === undefined) {
    throw createCliError("missing_record", `Session ${request.sessionId} was not found.`, {
      sessionId: request.sessionId,
    });
  }

  const summary = sessionSummary(session, records);
  const turns = records
    .filter((record) => record.kind === "turn")
    .map((record) => record.payload as TurnHandle)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map((turn) => ({
      turnId: turn.turnId,
      idempotencyKey: turn.idempotencyKey,
      state: turn.state,
      createdAt: turn.createdAt,
      updatedAt: turn.updatedAt,
      eventCursor: turn.eventCursor,
    }));
  const history = await replaySessionHistory(ledger, request.sessionId);
  const events = history.events.map((event: RuntimeEvent) => ({
    sequence: event.sequence,
    type: event.type,
    occurredAt: event.occurredAt,
    turnId: event.turnId,
    terminal: event.terminal,
    redaction: event.redaction,
  }));

  const {
    approvalRequestCount,
    approvalResponseCount,
    evidenceRefCount,
    ...sessionWithoutCounts
  } = summary;

  return sessionsShowResultSchema.parse({
    schema: "cli.sessions.show.result.v0.1",
    session: sessionWithoutCounts,
    turns,
    history: {
      eventCount: events.length,
      nextCursor: history.nextCursor,
      events,
    },
    approvalRequestCount,
    approvalResponseCount,
    evidenceRefCount,
  });
}

export async function runSessionsCommand(
  request: ParsedCliRequest,
) {
  switch (request.command) {
    case "sessions list":
      return runSessionsList(request);
    case "sessions show":
      return runSessionsShow(request);
    default:
      throw createCliError("internal_failure", "sessions command dispatch received an unexpected request.");
  }
}
