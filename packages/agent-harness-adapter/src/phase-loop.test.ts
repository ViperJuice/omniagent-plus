import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type {
  PhaseLoopLaunchRequest,
  PhaseLoopLaunchResult,
} from "./index.js";
import {
  mapPhaseLoopLaunchRequest,
  mapPhaseLoopLaunchResult,
} from "./index.js";

function readFixture<T>(path: string): T {
  return JSON.parse(
    readFileSync(new URL(path, import.meta.url), "utf8"),
  ) as T;
}

describe("agent-harness adapter", () => {
  it("maps phase-loop launch request and result fixtures while preserving model policy and run_mode semantics", () => {
    const requestFixture = readFixture<PhaseLoopLaunchRequest>(
      "../../../examples/agent-harness/phase-loop-launch-request.json",
    );
    const resultFixture = readFixture<PhaseLoopLaunchResult>(
      "../../../examples/agent-harness/phase-loop-launch-result.json",
    );

    const createSessionRequest = mapPhaseLoopLaunchRequest(requestFixture);
    const launchResult = mapPhaseLoopLaunchResult({
      request: requestFixture,
      available: resultFixture.available,
      unavailable_reason: resultFixture.unavailable_reason,
      fallback_reason: resultFixture.fallback_reason,
      blocker_class: resultFixture.blocker_class,
      verification_status: resultFixture.verification_status,
      terminal_status: resultFixture.terminal_status,
      terminal_summary: resultFixture.terminal_summary,
    });

    expect(createSessionRequest.targetHarness).toBe("codex");
    expect(createSessionRequest.metadata).toMatchObject({
      phase: "ADAPTERS",
      target_executor: "codex",
      selected_model: "gpt-5.5",
      selected_effort: "xhigh",
      run_mode: "governed",
      dry_run: true,
      fallback_reason: "fixed_window_usage_cap",
      silent_downgrade: false,
    });
    expect(launchResult).toEqual(resultFixture);
  });
});
