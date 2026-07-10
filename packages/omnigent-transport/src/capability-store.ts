import type { OmnigentCapabilitySnapshot } from "@consiliency/runtime-provider";
import type { AuditLedger } from "@omniagent-plus/state-ledger";

export class OmnigentCapabilityStore {
  constructor(private readonly ledger: AuditLedger) {}

  async append(
    snapshot: OmnigentCapabilitySnapshot,
  ): Promise<Extract<Awaited<ReturnType<AuditLedger["appendCapabilitySnapshot"]>>, { kind: "capability_snapshot" }>> {
    return this.ledger.appendCapabilitySnapshot(snapshot);
  }
}
