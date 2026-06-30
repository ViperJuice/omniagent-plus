import { existsSync } from "node:fs";

import {
  getStateLedgerPaths,
  replayUiControlSnapshotFromStateRoot,
} from "@omniagent-plus/state-ledger";

import { createCliError } from "../errors.js";
import type { ParsedCliRequest } from "../args.js";
import { controlSnapshotResultSchema } from "../types.js";

async function runControlSnapshot(request: ParsedCliRequest) {
  const stateStorePresent = existsSync(
    getStateLedgerPaths(request.stateRoot).ledgerPath,
  );
  const snapshot = await replayUiControlSnapshotFromStateRoot(request.stateRoot);

  return controlSnapshotResultSchema.parse({
    schema: "cli.control.snapshot.result.v0.1",
    interfaceFreezeGate: "IF-0-UI-12",
    readOnly: true,
    stateStorePresent,
    snapshot,
  });
}

export async function runControlCommand(
  request: ParsedCliRequest,
) {
  switch (request.command) {
    case "control snapshot":
      return runControlSnapshot(request);
    default:
      throw createCliError("internal_failure", "control command dispatch received an unexpected request.");
  }
}
