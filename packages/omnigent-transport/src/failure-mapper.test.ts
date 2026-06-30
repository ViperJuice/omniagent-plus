import { describe, expect, it } from "vitest";

import { mapCapabilityGap, mapCliFailure, mapDisconnectedBackend, mapHttpFailure } from "./failure-mapper.js";
import { OmnigentHttpError } from "./http-client.js";

describe("failure mapper", () => {
  it("maps validation, billing, policy, and rate-limit HTTP failures", () => {
    const validation = mapHttpFailure(
      new OmnigentHttpError({
        body: { error: "unsupported event type" },
        headers: {},
        method: "POST",
        path: "/v1/sessions/id/events",
        statusCode: 400,
      }),
    );
    const billing = mapHttpFailure(
      new OmnigentHttpError({
        body: { error: "billing issue" },
        headers: {},
        method: "POST",
        path: "/v1/sessions/id/events",
        statusCode: 403,
      }),
    );
    const policy = mapHttpFailure(
      new OmnigentHttpError({
        body: { error: "policy blocked" },
        headers: {},
        method: "POST",
        path: "/v1/sessions/id/events",
        statusCode: 403,
      }),
    );
    const rateLimit = mapHttpFailure(
      new OmnigentHttpError({
        body: { error: "usage cap reached" },
        headers: { "retry-after": "60" },
        method: "POST",
        path: "/v1/sessions/id/events",
        statusCode: 429,
      }),
    );

    expect(validation.failure.category).toBe("validation");
    expect(billing.limitClassification?.type).toBe("auth_or_billing_problem");
    expect(policy.limitClassification?.type).toBe("abuse_or_policy_block");
    expect(rateLimit.failure.category).toBe("rate_limit");
    expect(rateLimit.limitClassification?.type).toBe("fixed_window_usage_cap");
  });

  it("maps CLI, capability, and disconnected-backend failures", () => {
    const cliFailure = mapCliFailure({
      command: ["omnigent", "run", "demo-agent"],
      exitCode: 1,
      stderr: "billing quota exceeded",
      stdout: "",
    });
    const capabilityGap = mapCapabilityGap("child_session");
    const disconnected = mapDisconnectedBackend("stream", new Error("socket hung up"));

    expect(cliFailure.limitClassification?.type).toBe("auth_or_billing_problem");
    expect(capabilityGap.failure.category).toBe("backend_capability_missing");
    expect(disconnected.failure.category).toBe("transport");
  });
});
