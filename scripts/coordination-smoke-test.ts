import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { COMMAND_REGISTRY } from "../packages/cli/src/command-registry.js";
import { executeCli } from "../packages/cli/src/runtime.js";

async function run(args: string[], stateRoot: string) {
  const result = await executeCli(
    [...args, "--state-root", stateRoot, "--json"],
    COMMAND_REGISTRY,
  );
  const body = result.stdout || result.stderr;
  if (result.exitCode !== 0 && !args.includes("route-task")) {
    throw new Error(body);
  }
  return {
    exitCode: result.exitCode,
    envelope: JSON.parse(body) as unknown,
  };
}

const stateRoot = await mkdtemp(join(tmpdir(), "coordination-smoke-"));
const acquired = await run(
  [
    "coordination",
    "leases",
    "acquire",
    "--holder",
    "smoke-holder-a",
    "--scope",
    "path-set:packages/cli",
    "--mode",
    "hard",
    "--ttl-seconds",
    "120",
  ],
  stateRoot,
);
const conflict = await run(
  [
    "route-task",
    "--task-id",
    "smoke-conflict",
    "--coordination-scope",
    "path-set:packages/cli/src",
    "--coordination-holder",
    "smoke-holder-b",
    "--coordination-request-yield",
  ],
  stateRoot,
);
await run(
  [
    "coordination",
    "inbox",
    "list",
    "--scope",
    "path-set:packages/cli",
  ],
  stateRoot,
);

const leaseId = ((acquired.envelope as { result: { lease: { lease_id: string } } }).result.lease.lease_id);
await run(
  [
    "coordination",
    "leases",
    "renew",
    "--lease-id",
    leaseId,
    "--holder",
    "smoke-holder-a",
  ],
  stateRoot,
);
await run(
  [
    "coordination",
    "leases",
    "release",
    "--lease-id",
    leaseId,
    "--holder",
    "smoke-holder-a",
  ],
  stateRoot,
);
const reacquired = await run(
  [
    "coordination",
    "leases",
    "acquire",
    "--holder",
    "smoke-holder-b",
    "--scope",
    "path-set:packages/cli",
    "--mode",
    "hard",
    "--ttl-seconds",
    "120",
  ],
  stateRoot,
);

console.log(JSON.stringify({
  ok: true,
  stateRoot,
  conflictExitCode: conflict.exitCode,
  reacquired: (reacquired.envelope as { result: { granted: boolean } }).result.granted,
}, null, 2));
