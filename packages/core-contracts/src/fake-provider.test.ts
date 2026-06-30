import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { FakeAgentRuntimeProvider } from "./fake-provider.js";
import { getProtocolFailure } from "./fake-event-stream.js";
import { createRuntimeFailure } from "./errors.js";

function readProviderFixture<T>(name: string): T {
  return JSON.parse(
    readFileSync(
      new URL(`../../../fixtures/core/fake-provider/${name}`, import.meta.url),
      "utf8",
    ),
  ) as T;
}

describe("fake provider", () => {
  it("returns the same session for duplicate createSession idempotency keys", async () => {
    const fixture = readProviderFixture<{
      idempotencyKey: string;
      title: string;
      expectedSessionId: string;
    }>("create-session-idempotency.json");
    const provider = new FakeAgentRuntimeProvider();

    const first = await provider.createSession({
      idempotencyKey: fixture.idempotencyKey,
      runtime: "omnigent",
      targetHarness: "codex",
      title: fixture.title,
    });
    const second = await provider.createSession({
      idempotencyKey: fixture.idempotencyKey,
      runtime: "omnigent",
      targetHarness: "codex",
      title: fixture.title,
    });

    expect(first.id).toBe(fixture.expectedSessionId);
    expect(second.id).toBe(first.id);
  });

  it("enforces one active turn per session and keeps duplicate turn idempotency deterministic", async () => {
    const fixture = readProviderFixture<{
      firstTurnKey: string;
      secondTurnKey: string;
      duplicateTurnKey: string;
      expectedFailureCategory: string;
    }>("turn-concurrency-limit.json");
    const provider = new FakeAgentRuntimeProvider();
    const session = await provider.createSession({
      idempotencyKey: "bootcore-session",
      runtime: "omnigent",
      targetHarness: "codex",
      title: "BOOTCORE provider test",
    });

    const firstTurn = await provider.sendTurn({
      idempotencyKey: fixture.firstTurnKey,
      message: "start turn",
      sessionId: session.id,
    });
    const duplicateTurn = await provider.sendTurn({
      idempotencyKey: fixture.duplicateTurnKey,
      message: "start turn",
      sessionId: session.id,
      turnId: firstTurn.turnId,
    });

    expect(duplicateTurn.turnId).toBe(firstTurn.turnId);

    await expect(
      provider.sendTurn({
        idempotencyKey: fixture.secondTurnKey,
        message: "conflicting turn",
        sessionId: session.id,
      }),
    ).rejects.toMatchObject({
      category: fixture.expectedFailureCategory,
    });

    const completed = provider.completeTurn(session.id, firstTurn.turnId);
    expect(completed.state).toBe("completed");
  });

  it("cancels and logically closes a session using provider-owned behavior", async () => {
    const provider = new FakeAgentRuntimeProvider();
    const session = await provider.createSession({
      idempotencyKey: "closeable-session",
      runtime: "omnigent",
      targetHarness: "codex",
      title: "BOOTCORE close test",
    });
    const turn = await provider.sendTurn({
      idempotencyKey: "closeable-turn",
      message: "cancel this turn",
      sessionId: session.id,
    });

    const cancelled = await provider.cancelTurn(turn);
    expect(cancelled.state).toBe("cancelled");

    await provider.closeSession(session.id);
    const info = await provider.getSessionInfo(session.id);
    expect(info.state).toBe("closed");
    expect(getProtocolFailure(createRuntimeFailure({
      actor: "provider",
      category: "internal",
      message: "sample",
      retryable: false,
      scope: "system",
    }))?.category).toBe("internal");
  });
});
