import { describe, expect, it } from "vitest";

import {
  adaptersInterfaceFreezeGate,
  mapExecutorAdapterResult,
  mapInvokeAgenticHarnessRequest,
} from "./index.js";

function createRequestFixture() {
  return {
    harness: "omnigent" as const,
    target_harness: "codex" as const,
    repo_root: "/workspace/repo",
    adapter: "governed-pipeline" as const,
    request: {
      task_id: "adapter-phase-verify",
      idempotency_key: "gp-adapter-phase-verify",
      title: "adapter verify",
      preferred_executor: "codex" as const,
      fallback_executor: "claude-code" as const,
    },
    route_decision: {
      schema: "route_decision.v0.1" as const,
      taskId: "adapter-phase-verify",
      selectedProvider: "openai",
      selectedHarness: "codex",
      preferredProvider: "openai",
      preferredHarness: "codex",
      fallbackUsed: true,
      fallbackReason: "fixed_window_usage_cap",
      capabilityFit: 0.84,
      providerHealth: 0.72,
      currentCapacity: 0.4,
      contextPortability: "high" as const,
      portabilityScore: 0.9,
      activeTurnTarget: 1,
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
  it("exports the interface freeze gate and preserves metadata_only adapter semantics", () => {
    const request = createRequestFixture();
    const launch = mapInvokeAgenticHarnessRequest(request);
    const result = mapExecutorAdapterResult({
      request,
      model: "gpt-5.5",
      status: "blocked",
      transport_ok: true,
      parse_ok: true,
      parse_mode: "structured_json",
      unavailable_reason: "metadata_only launch gate preserved",
      blocker: {
        class: "review_gate_block",
        summary: "review gate block preserved",
      },
      log_excerpt: "metadata_only redacted adapter log excerpt",
    });

    expect(adaptersInterfaceFreezeGate).toBe("IF-0-ADAPTERS-10");
    expect(launch.metadata).toMatchObject({
      selected_provider: "openai",
      selected_harness: "codex",
      silent_downgrade: false,
    });
    expect(result.policy.silent_downgrade).toBe(false);
    expect(result.log_excerpt?.content).toContain("metadata_only");
    expect(result.blocker?.class).toBe("review_gate_block");
  });

  it("rejects secret-bearing log excerpts", () => {
    const request = createRequestFixture();

    expect(() =>
      mapExecutorAdapterResult({
        request,
        status: "failed",
        transport_ok: true,
        parse_ok: false,
        parse_mode: "text",
        log_excerpt: "bearer sk-secret-token",
      }),
    ).toThrow("contains");
  });

  it("rejects raw transcript payloads and unknown blocker classes", () => {
    const request = createRequestFixture();

    expect(() =>
      mapExecutorAdapterResult({
        request,
        status: "failed",
        transport_ok: true,
        parse_ok: false,
        parse_mode: "text",
        log_excerpt: "{\"messages\":[{\"role\":\"assistant\"}]}",
      }),
    ).toThrow("raw provider payload");

    expect(() =>
      mapExecutorAdapterResult({
        request,
        status: "blocked",
        transport_ok: true,
        parse_ok: true,
        parse_mode: "structured_json",
        blocker: {
          class: "unexpected_blocker" as "contract_bug",
          summary: "unknown blocker",
        },
      }),
    ).toThrow("unrecognized blocker class");
  });

  it("rejects silent label downgrade between route decisions and target_harness", () => {
    const request = createRequestFixture();
    const downgraded = {
      ...request,
      route_decision: {
        ...request.route_decision,
        selectedHarness: "claude-code",
      },
    };

    expect(() => mapInvokeAgenticHarnessRequest(downgraded)).toThrow(
      "preserve target_harness labels",
    );
  });
});
