import type { HarnessId, RouteDecision } from "@omniagent-plus/core-contracts";

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

export const targetExecutors = [
  "claude",
  "codex",
  "gemini",
  "opencode",
  "pi",
] as const;
export type TargetExecutor = (typeof targetExecutors)[number];

export const phaseLoopRunModes = [
  "interactive",
  "product",
  "autonomous",
  "governed",
] as const;
export type PhaseLoopRunMode = (typeof phaseLoopRunModes)[number];

export const phaseLoopEfforts = [
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;
export type PhaseLoopEffort = (typeof phaseLoopEfforts)[number];

export const phaseLoopAuthPreflightModes = [
  "metadata_only",
  "full",
  "skip",
] as const;
export type PhaseLoopAuthPreflightMode =
  (typeof phaseLoopAuthPreflightModes)[number];

export const phaseLoopTimeoutPostures = [
  "runner_managed",
  "executor_managed",
  "manual",
] as const;
export type PhaseLoopTimeoutPosture =
  (typeof phaseLoopTimeoutPostures)[number];

export const phaseLoopOutputCaptureFormats = [
  "json_stream",
  "text",
  "events",
] as const;
export type PhaseLoopOutputCaptureFormat =
  (typeof phaseLoopOutputCaptureFormats)[number];

export const phaseLoopTerminalStatuses = [
  "unplanned",
  "planned",
  "executing",
  "executed",
  "awaiting_phase_closeout",
  "complete",
  "blocked",
  "unknown",
] as const;
export type PhaseLoopTerminalStatus =
  (typeof phaseLoopTerminalStatuses)[number];

export const phaseLoopVerificationStatuses = [
  "not_run",
  "passed",
  "failed",
  "blocked",
] as const;
export type PhaseLoopVerificationStatus =
  (typeof phaseLoopVerificationStatuses)[number];

export interface PhaseLoopLaunchRequest {
  readonly adapter: "agent-harness";
  readonly phase: string;
  readonly phase_plan: string;
  readonly repo_root: string;
  readonly target_executor: TargetExecutor;
  readonly selected_model: string;
  readonly selected_effort: PhaseLoopEffort;
  readonly run_mode: PhaseLoopRunMode;
  readonly dry_run: boolean;
  readonly auth_preflight_mode: PhaseLoopAuthPreflightMode;
  readonly auth_preflight_probes: readonly string[];
  readonly timeout_posture: PhaseLoopTimeoutPosture;
  readonly output_capture_format: PhaseLoopOutputCaptureFormat;
  readonly idempotency_key: string;
  readonly correlation_id?: string;
  readonly title: string;
  readonly initial_message?: string;
  readonly identity_profile_id?: string;
  readonly route_decision?: RouteDecision;
}

export interface PhaseLoopLaunchResult {
  readonly executor: "omnigent";
  readonly target_executor: TargetExecutor;
  readonly selected_executor: HarnessId;
  readonly available: boolean;
  readonly unavailable_reason?: string;
  readonly selected_model: string;
  readonly selected_effort: PhaseLoopEffort;
  readonly run_mode: PhaseLoopRunMode;
  readonly dry_run: boolean;
  readonly auth_preflight_mode: PhaseLoopAuthPreflightMode;
  readonly auth_preflight_probes: readonly string[];
  readonly timeout_posture: PhaseLoopTimeoutPosture;
  readonly output_capture_format: PhaseLoopOutputCaptureFormat;
  readonly fallback_reason?: string;
  readonly blocker_class?: AdapterBlockerClass;
  readonly verification_status: PhaseLoopVerificationStatus;
  readonly terminal_status: PhaseLoopTerminalStatus;
  readonly terminal_summary?: string;
}

export interface PhaseLoopLaunchResultInput {
  readonly request: PhaseLoopLaunchRequest;
  readonly available: boolean;
  readonly unavailable_reason?: string;
  readonly fallback_reason?: string;
  readonly blocker_class?: AdapterBlockerClass;
  readonly verification_status: PhaseLoopVerificationStatus;
  readonly terminal_status: PhaseLoopTerminalStatus;
  readonly terminal_summary?: string;
}
