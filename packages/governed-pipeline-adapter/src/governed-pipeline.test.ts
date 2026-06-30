import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type {
  GovernedPipelineExecutorAdapterResult,
  GovernedPipelineInvokeAgenticHarnessRequest,
} from "./index.js";
import {
  mapExecutorAdapterResult,
  mapInvokeAgenticHarnessRequest,
} from "./index.js";

function readFixture<T>(path: string): T {
  return JSON.parse(
    readFileSync(new URL(path, import.meta.url), "utf8"),
  ) as T;
}

describe("governed-pipeline adapter", () => {
  it("maps invokeAgenticHarness fixtures into public provider launch inputs and executor adapter results", () => {
    const requestFixture =
      readFixture<GovernedPipelineInvokeAgenticHarnessRequest>(
        "../../../examples/governed-pipeline/invoke-agentic-harness.json",
      );
    const resultFixture = readFixture<GovernedPipelineExecutorAdapterResult>(
      "../../../examples/governed-pipeline/executor-adapter-result.json",
    );

    const createSessionRequest = mapInvokeAgenticHarnessRequest(requestFixture);
    const adapterResult = mapExecutorAdapterResult({
      request: requestFixture,
      model: resultFixture.model,
      status: resultFixture.status,
      transport_ok: resultFixture.transport_ok,
      parse_ok: resultFixture.parse_ok,
      parse_mode: resultFixture.parse_mode,
      unavailable_reason: resultFixture.unavailable_reason,
      blocker: resultFixture.blocker,
      log_excerpt: resultFixture.log_excerpt?.content,
      runtime_ledger_citations: resultFixture.runtime_ledger_citations,
    });

    expect(createSessionRequest.runtime).toBe("omnigent");
    expect(createSessionRequest.targetHarness).toBe(
      requestFixture.target_harness,
    );
    expect(createSessionRequest.targetProvider).toBe("openai");
    expect(createSessionRequest.metadata).toMatchObject({
      adapter: "governed-pipeline",
      task_id: requestFixture.request.task_id,
      selected_provider: "openai",
      selected_harness: "codex",
      silent_downgrade: false,
      fallback_reason: "fixed_window_usage_cap",
    });

    expect(adapterResult).toEqual(resultFixture);
  });
});
