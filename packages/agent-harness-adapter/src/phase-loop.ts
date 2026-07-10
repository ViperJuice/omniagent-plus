import {
  sanitizeMetadataText,
  type CreateSessionRequest,
  type HarnessId,
} from "@consiliency/runtime-provider";

import {
  adapterBlockerClasses,
  phaseLoopAuthPreflightModes,
  phaseLoopEfforts,
  phaseLoopOutputCaptureFormats,
  phaseLoopRunModes,
  phaseLoopTerminalStatuses,
  phaseLoopTimeoutPostures,
  phaseLoopVerificationStatuses,
  type PhaseLoopLaunchRequest,
  type PhaseLoopLaunchResult,
  type PhaseLoopLaunchResultInput,
  type TargetExecutor,
} from "./types.js";

const targetExecutorMap: Record<TargetExecutor, HarnessId> = {
  claude: "claude-code",
  codex: "codex",
  gemini: "gemini-antigravity",
  opencode: "opencode",
  pi: "pi",
};

const adapterBlockerClassSet = new Set(adapterBlockerClasses);
const phaseLoopRunModeSet = new Set(phaseLoopRunModes);
const phaseLoopEffortSet = new Set(phaseLoopEfforts);
const phaseLoopAuthPreflightModeSet = new Set(phaseLoopAuthPreflightModes);
const phaseLoopTimeoutPostureSet = new Set(phaseLoopTimeoutPostures);
const phaseLoopOutputCaptureFormatSet = new Set(phaseLoopOutputCaptureFormats);
const phaseLoopTerminalStatusSet = new Set(phaseLoopTerminalStatuses);
const phaseLoopVerificationStatusSet = new Set(phaseLoopVerificationStatuses);

function canonicalHarness(targetExecutor: TargetExecutor): HarnessId {
  return targetExecutorMap[targetExecutor];
}

function assertLaunchRequest(request: PhaseLoopLaunchRequest): void {
  if (!phaseLoopRunModeSet.has(request.run_mode)) {
    throw new Error(`unrecognized run_mode: ${request.run_mode}`);
  }

  if (!phaseLoopEffortSet.has(request.selected_effort)) {
    throw new Error(`unrecognized selected_effort: ${request.selected_effort}`);
  }

  if (!phaseLoopAuthPreflightModeSet.has(request.auth_preflight_mode)) {
    throw new Error(
      `unrecognized auth_preflight_mode: ${request.auth_preflight_mode}`,
    );
  }

  if (!phaseLoopTimeoutPostureSet.has(request.timeout_posture)) {
    throw new Error(`unrecognized timeout_posture: ${request.timeout_posture}`);
  }

  if (!phaseLoopOutputCaptureFormatSet.has(request.output_capture_format)) {
    throw new Error(
      `unrecognized output_capture_format: ${request.output_capture_format}`,
    );
  }

  if (
    request.route_decision !== undefined &&
    request.route_decision.silentDowngrade !== false
  ) {
    throw new Error("agent-harness adapter must reject silent_downgrade");
  }

  if (
    request.route_decision !== undefined &&
    request.route_decision.selectedHarness !==
      canonicalHarness(request.target_executor)
  ) {
    throw new Error("agent-harness adapter must preserve target_executor labels");
  }
}

function validateBlockerClass(
  blockerClass: PhaseLoopLaunchResult["blocker_class"],
): PhaseLoopLaunchResult["blocker_class"] {
  if (blockerClass === undefined) {
    return undefined;
  }

  if (!adapterBlockerClassSet.has(blockerClass)) {
    throw new Error(`unrecognized blocker class: ${blockerClass}`);
  }

  return blockerClass;
}

export function mapPhaseLoopLaunchRequest(
  request: PhaseLoopLaunchRequest,
): CreateSessionRequest {
  assertLaunchRequest(request);

  return {
    runtime: "omnigent",
    targetHarness: canonicalHarness(request.target_executor),
    idempotencyKey: request.idempotency_key,
    correlationId: request.correlation_id,
    targetProvider:
      request.route_decision?.selectedProvider === "openai"
        ? "openai"
        : undefined,
    identityProfileId:
      request.route_decision?.selectedIdentityProfileId ??
      request.identity_profile_id,
    title: sanitizeMetadataText(request.title, "title"),
    repoRoot: request.repo_root,
    initialMessage: request.initial_message,
    metadata: {
      adapter: request.adapter,
      phase: request.phase,
      phase_plan: request.phase_plan,
      target_executor: request.target_executor,
      selected_model: sanitizeMetadataText(
        request.selected_model,
        "selected model",
      ),
      selected_effort: request.selected_effort,
      run_mode: request.run_mode,
      dry_run: request.dry_run,
      auth_preflight_mode: request.auth_preflight_mode,
      auth_preflight_probes: [...request.auth_preflight_probes],
      timeout_posture: request.timeout_posture,
      output_capture_format: request.output_capture_format,
      fallback_reason: request.route_decision?.fallbackReason,
      silent_downgrade: false,
    },
  };
}

export function mapPhaseLoopLaunchResult(
  input: PhaseLoopLaunchResultInput,
): PhaseLoopLaunchResult {
  assertLaunchRequest(input.request);

  if (!phaseLoopVerificationStatusSet.has(input.verification_status)) {
    throw new Error(
      `unrecognized verification_status: ${input.verification_status}`,
    );
  }

  if (!phaseLoopTerminalStatusSet.has(input.terminal_status)) {
    throw new Error(`unrecognized terminal_status: ${input.terminal_status}`);
  }

  return {
    executor: "omnigent",
    target_executor: input.request.target_executor,
    selected_executor: canonicalHarness(input.request.target_executor),
    available: input.available,
    unavailable_reason:
      input.unavailable_reason === undefined
        ? undefined
        : sanitizeMetadataText(
            input.unavailable_reason,
            "unavailable reason",
          ),
    selected_model: sanitizeMetadataText(
      input.request.selected_model,
      "selected model",
    ),
    selected_effort: input.request.selected_effort,
    run_mode: input.request.run_mode,
    dry_run: input.request.dry_run,
    auth_preflight_mode: input.request.auth_preflight_mode,
    auth_preflight_probes: [...input.request.auth_preflight_probes],
    timeout_posture: input.request.timeout_posture,
    output_capture_format: input.request.output_capture_format,
    fallback_reason:
      input.fallback_reason ?? input.request.route_decision?.fallbackReason,
    blocker_class: validateBlockerClass(input.blocker_class),
    verification_status: input.verification_status,
    terminal_status: input.terminal_status,
    terminal_summary:
      input.terminal_summary === undefined
        ? undefined
        : sanitizeMetadataText(input.terminal_summary, "terminal summary"),
  };
}
