#!/usr/bin/env node
// P0a consumability smoke (IF-0-PUBHARDEN-1).
//
// A STANDALONE consumer that imports ONLY the published `@consiliency/runtime-provider`
// package surface (no repo-internal / relative imports) and drives one
// createSession -> sendTurn -> closeSession turn through `FakeAgentRuntimeProvider`.
// Exits 0 on success, non-zero on any failure. This is the machine-checkable proof
// that the built + un-privated package is consumable from a scratch install.
import { FakeAgentRuntimeProvider } from "@consiliency/runtime-provider";

async function main() {
  const provider = new FakeAgentRuntimeProvider();

  const session = await provider.createSession({
    idempotencyKey: "p0a-smoke-session",
    runtime: "omnigent",
    targetHarness: "codex",
    title: "P0a fake-provider smoke",
  });
  if (!session?.id) throw new Error("createSession returned no session id");

  const turn = await provider.sendTurn({
    idempotencyKey: "p0a-smoke-turn",
    sessionId: session.id,
    message: "hello from the P0a smoke",
  });
  if (!turn?.turnId) throw new Error("sendTurn returned no turn handle");

  // The Fake provider is stream-driven: `completeTurn` appends the normal terminal
  // fixture, driving the running turn to a terminal `completed` handle.
  const completed = provider.completeTurn(session.id, turn.turnId);
  if (completed.state !== "completed") {
    throw new Error(`expected turn state 'completed'; got '${completed.state}'`);
  }

  const history = await provider.readHistory(session.id);
  const types = history.events.map((event) => event.type);
  const sawTerminal = history.events.some((event) => event.terminal === true);
  if (!sawTerminal) {
    throw new Error(`expected a terminal event in history; saw: ${types.join(", ")}`);
  }

  await provider.closeSession(session.id);

  const info = await provider.getSessionInfo(session.id);
  if (info.state !== "closed") {
    throw new Error(`expected session state 'closed' after close; got '${info.state}'`);
  }

  console.log(
    `P0a OK: session=${session.id} turn=${turn.turnId} events=[${types.join(", ")}] state=${info.state}`,
  );
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error("P0a FAILED:", error?.message ?? error);
    process.exit(1);
  },
);
