import { sanitizeMetadataText } from "@consiliency/runtime-provider";
import { classifyLimitSignal } from "@omniagent-plus/rate-limit-catalog";
import { AuditLedger } from "@omniagent-plus/state-ledger";

import { classifyLimitResultSchema } from "../types.js";
import type { ParsedCliRequest } from "../args.js";

function sanitizeExcerpt(
  value: string | undefined,
  label: string,
  notes: string[],
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  try {
    return sanitizeMetadataText(value, label, 280);
  } catch {
    notes.push(`CLI redacted unsafe ${label}.`);
    return undefined;
  }
}

export async function runClassifyLimitCommand(
  request: ParsedCliRequest,
) {
  if (request.command !== "classify-limit") {
    throw new Error("classify-limit command dispatch received an unexpected request.");
  }

  const classification = classifyLimitSignal({
    provider: request.provider,
    harness: request.harness,
    statusCode: request.statusCode,
    exitCode: request.exitCode,
    bodyText: request.bodyText,
    stderrText: request.stderrText,
    stdoutText: request.stdoutText,
    headers: request.headers,
  });
  const notes = [...(classification.notes ?? [])];
  const sanitizedClassification = {
    ...classification,
    sessionId: request.sessionId,
    identityProfileId: request.identityProfileId,
    rawSignal: {
      ...classification.rawSignal,
      stderrExcerpt: sanitizeExcerpt(
        classification.rawSignal.stderrExcerpt,
        "stderr excerpt",
        notes,
      ),
      stdoutExcerpt: sanitizeExcerpt(
        classification.rawSignal.stdoutExcerpt,
        "stdout excerpt",
        notes,
      ),
    },
    notes: notes.length === 0 ? undefined : notes,
  };

  if (request.record) {
    const ledger = await AuditLedger.open({
      rootDir: request.stateRoot,
    });
    const entry = await ledger.appendLimitClassification(
      sanitizedClassification,
      {
        taskId: request.taskId,
      },
    );
    return classifyLimitResultSchema.parse({
      schema: "cli.classify-limit.result.v0.1",
      recordMode: "recorded",
      classification: sanitizedClassification,
      persistedRecord: {
        recordId: entry.recordId,
        sequence: entry.sequence,
      },
    });
  }

  return classifyLimitResultSchema.parse({
    schema: "cli.classify-limit.result.v0.1",
    recordMode: "dry_run",
    classification: sanitizedClassification,
  });
}
