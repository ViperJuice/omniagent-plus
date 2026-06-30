import type {
  IdentityProfileStatus,
  StateLedgerEntry,
} from "@omniagent-plus/core-contracts";
import { AuditLedger } from "@omniagent-plus/state-ledger";

import type { IdentityProfilePreflightResult } from "./types.js";

export interface IdentityProfileStatusStoreOptions {
  readonly rootDir: string;
}

export class IdentityProfileStatusStore {
  readonly ledger: AuditLedger;

  private constructor(ledger: AuditLedger) {
    this.ledger = ledger;
  }

  static async open(
    options: IdentityProfileStatusStoreOptions,
  ): Promise<IdentityProfileStatusStore> {
    return new IdentityProfileStatusStore(
      await AuditLedger.open({ rootDir: options.rootDir }),
    );
  }

  async appendStatus(
    status: IdentityProfileStatus,
  ): Promise<Extract<StateLedgerEntry, { kind: "identity_profile_status" }>> {
    return this.ledger.appendIdentityProfileStatus(status);
  }

  async appendPreflight(
    result: IdentityProfilePreflightResult,
  ): Promise<Extract<StateLedgerEntry, { kind: "identity_profile_status" }>> {
    return this.appendStatus(result.status);
  }

  async listByProfileId(profileId: string): Promise<IdentityProfileStatus[]> {
    const records = await this.ledger.listRecordsByKind("identity_profile_status");
    return records
      .map((record) => record.payload)
      .filter((status) => status.profileId === profileId);
  }
}
