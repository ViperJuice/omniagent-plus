import { describe, expect, it } from "vitest";

import {
  adaptersInterfaceFreezeGate,
  mapPhaseLoopLaunchRequest,
  mapPhaseLoopLaunchResult,
} from "./index.js";

function createRequestFixture() {
  return {
    adapter: "agent-harness" as const,
    phase: "ADAPTERS",
    phase_plan: "plans/phase-plan-v1-ADAPTERS.md",
    repo_root: "/workspace/repo",
    target_executor: "codex" as const,
    selected_model: "gpt-5.5",
    selected_effort: "xhigh" as const,
    run_mode: "governed" as const,
    dry_run: true,
    auth_preflight_mode: "metadata_only" as const,
    auth_preflight_probes: ["codex --version", "codex login status"],
    timeout_posture: "runner_managed" as const,
    output_capture_format: "json_stream" as const,
    idempotency_key: "phase-loop-adapter",
    title: "phase loop adapter verify",
    route_decision: {
      schema: "route_decision.v0.1" as const,
      taskId: "phase-loop-adapter",
      selectedProvider: "openai",
      selectedHarness: "codex",
      preferredProvider: "openai",
      preferredHarness: "codex",
      fallbackUsed: true,
      fallbackReason: "fixed_window_usage_cap",
      capabilityFit: 0.86,
      providerHealth: 0.74,
      currentCapacity: 0.5,
      contextPortability: "medium" as const,
      portabilityScore: 0.66,
      activeTurnTarget: 2,
      cooldownState: {
        providerFamilyBlocked: false,
        identityBlocked: false,
        sameProviderAccountSwitch: "forbidden" as const,
      },
      launchGate: {
        action: "allowed" as const,
        reason: "persisted before launch",
        routeDecisionPersisted: true,
        labelsMatch: true,
        manualConfirmationProvided: false,
      },
      routeReason: "usage_cap" as const,
      silentDowngrade: false as const,
    },
  };
}

describe("phase verification", () => {
  it("exports the interface freeze gate and preserves dry run as metadata rather than terminal_status", () => {
    const request = createRequestFixture();
    const launch = mapPhaseLoopLaunchRequest(request);
    const result = mapPhaseLoopLaunchResult({
      request,
      available: false,
      unavailable_reason: "metadata_only preflight unavailable reason",
      fallback_reason: "fixed_window_usage_cap",
      blocker_class: "review_gate_block",
      verification_status: "not_run",
      terminal_status: "planned",
      terminal_summary: "metadata_only dry run preserved",
    });

    expect(adaptersInterfaceFreezeGate).toBe("IF-0-ADAPTERS-10");
    expect(launch.targetHarness).toBe("codex");
    expect(result.dry_run).toBe(true);
    expect(result.terminal_status).toBe("planned");
    expect(result.unavailable_reason).toContain("metadata_only");
  });

  it("rejects dry_run as a terminal status and unknown blocker classes", () => {
    const request = createRequestFixture();

    expect(() =>
      mapPhaseLoopLaunchResult({
        request,
        available: true,
        verification_status: "not_run",
        terminal_status: "dry_run" as "planned",
      }),
    ).toThrow("unrecognized terminal_status");

    expect(() =>
      mapPhaseLoopLaunchResult({
        request,
        available: false,
        unavailable_reason: "codex unavailable",
        blocker_class: "unexpected_blocker" as "contract_bug",
        verification_status: "blocked",
        terminal_status: "blocked",
      }),
    ).toThrow("unrecognized blocker class");
  });

  it("rejects silent label downgrade between target_executor and route decisions", () => {
    const request = createRequestFixture();
    const downgraded = {
      ...request,
      route_decision: {
        ...request.route_decision,
        selectedHarness: "claude-code",
      },
    };

    expect(() => mapPhaseLoopLaunchRequest(downgraded)).toThrow(
      "preserve target_executor labels",
    );
  });
});
