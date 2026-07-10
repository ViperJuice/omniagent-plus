import type { WorktreeLease } from "@consiliency/runtime-provider";

import type { WorktreeLeaseManager } from "./lease-manager.js";
import type { RenewWorktreeLeaseOptions } from "./types.js";

export async function renewLeaseHeartbeat(
  manager: WorktreeLeaseManager,
  lease: WorktreeLease,
  options: RenewWorktreeLeaseOptions = {},
): Promise<WorktreeLease> {
  return manager.renewLease(lease, options);
}
