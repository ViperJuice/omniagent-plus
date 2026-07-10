import type {
  HarnessId,
  RedactedText,
  RouteDecision,
  RuntimeEvidenceRef,
} from "@consiliency/runtime-provider";

export const adaptersInterfaceFreezeGate = "IF-0-ADAPTERS-10";

export const adapterBlockerClasses = [
  "missing_secret",
  "account_or_billing_setup",
  "admin_approval",
  "destructive_operation",
  "ambiguous_roadmap_selection",
  "product_decision_missing",
  "dirty_worktree_conflict",
  "branch_sync_conflict",
  "stalled_child_observation",
  "repeated_verification_failure",
  "sandbox_command_restriction",
  "upstream_phase_unmet",
  "contract_bug",
  "gold_record_amendment",
  "closeout_evidence_drift",
  "closeout_scope_violation",
  "unretryable_external_outage",
  "stuck_loop",
  "merge_conflict",
  "operator_override_missing_reason",
  "concurrent_dispatch",
  "verification_evidence_missing",
  "review_gate_block",
  "docs_freshness_stale",
  "none",
] as const;
export type AdapterBlockerClass = (typeof adapterBlockerClasses)[number];

export interface AdapterBlocker {
  readonly class: AdapterBlockerClass;
  readonly summary: string;
}

export const governedPipelineResultStatuses = [
  "ok",
  "blocked",
  "unavailable",
  "failed",
] as const;
export type GovernedPipelineResultStatus =
  (typeof governedPipelineResultStatuses)[number];

export const governedPipelineParseModes = [
  "structured_json",
  "text",
  "tool_call",
] as const;
export type GovernedPipelineParseMode =
  (typeof governedPipelineParseModes)[number];

export interface GovernedPipelineInvokeAgenticHarnessRequest {
  readonly harness: "omnigent";
  readonly target_harness: HarnessId;
  readonly repo_root: string;
  readonly adapter: "governed-pipeline";
  readonly request: {
    readonly task_id: string;
    readonly idempotency_key: string;
    readonly correlation_id?: string;
    readonly title: string;
    readonly initial_message?: string;
    readonly identity_profile_id?: string;
    readonly preferred_executor?: HarnessId;
    readonly fallback_executor?: HarnessId;
  };
  readonly route_decision: RouteDecision;
}

export interface GovernedPipelineExecutorAdapterResult {
  readonly schema: "executor_adapter_result.v0.1";
  readonly executor: "omnigent";
  readonly target_harness: HarnessId;
  readonly provider: string;
  readonly model?: string;
  readonly status: GovernedPipelineResultStatus;
  readonly transport_ok: boolean;
  readonly parse_ok: boolean;
  readonly parse_mode: GovernedPipelineParseMode;
  readonly unavailable_reason?: string;
  readonly blocker?: AdapterBlocker;
  readonly log_excerpt?: RedactedText;
  readonly policy: {
    readonly preferred_executor?: HarnessId;
    readonly fallback_executor?: HarnessId;
    readonly fallback_reason?: string;
    readonly silent_downgrade: false;
  };
  readonly runtime_ledger_citations?: readonly RuntimeEvidenceRef[];
}

export interface GovernedPipelineAdapterResultInput {
  readonly request: GovernedPipelineInvokeAgenticHarnessRequest;
  readonly model?: string;
  readonly status: GovernedPipelineResultStatus;
  readonly transport_ok: boolean;
  readonly parse_ok: boolean;
  readonly parse_mode: GovernedPipelineParseMode;
  readonly unavailable_reason?: string;
  readonly blocker?: AdapterBlocker;
  readonly log_excerpt?: string;
  readonly runtime_ledger_citations?: readonly RuntimeEvidenceRef[];
}
