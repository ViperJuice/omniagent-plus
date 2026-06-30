import { describe, expect, it } from "vitest";

import { CliError } from "./errors.js";
import { parseCliArgs } from "./args.js";

describe("argument parsing", () => {
  it("parses global state-root/json flags for health", () => {
    const parsed = parseCliArgs([
      "--json",
      "--state-root",
      "./tmp/state",
      "health",
    ]);

    expect(parsed.command).toBe("health");
    expect(parsed.json).toBe(true);
    expect(parsed.stateRoot.endsWith("/tmp/state")).toBe(true);
  });

  it("parses session and route identifiers for subcommands", () => {
    const session = parseCliArgs(["sessions", "show", "session-1"]);
    const route = parseCliArgs([
      "route-task",
      "--task-id",
      "task-1",
      "--record",
      "--allow-cross-provider-migration",
    ]);

    if (session.command !== "sessions show") {
      throw new Error("Expected a sessions show request.");
    }
    if (route.command !== "route-task") {
      throw new Error("Expected a route-task request.");
    }

    expect(session.command).toBe("sessions show");
    expect(session.sessionId).toBe("session-1");
    expect(route.command).toBe("route-task");
    expect(route.taskId).toBe("task-1");
    expect(route.record).toBe(true);
  });

  it("rejects malformed commandlines with typed argument errors", () => {
    expect(() => parseCliArgs(["route-task"])).toThrow(CliError);
  });
});
