import {
  harnessIds,
  providerFamilyIds,
  redactUntrustedText,
  sanitizeMetadataText,
  type CreateSessionRequest,
  type HarnessId,
  type ProviderFamilyId,
} from "@consiliency/runtime-provider";

import {
  adapterBlockerClasses,
  governedPipelineParseModes,
  governedPipelineResultStatuses,
  type AdapterBlocker,
  type GovernedPipelineAdapterResultInput,
  type GovernedPipelineExecutorAdapterResult,
  type GovernedPipelineInvokeAgenticHarnessRequest,
} from "./types.js";

const providerFamilyIdSet = new Set<ProviderFamilyId>(providerFamilyIds);
const harnessIdSet = new Set<HarnessId>(harnessIds);
const adapterBlockerClassSet = new Set(adapterBlockerClasses);
const governedPipelineResultStatusSet = new Set(governedPipelineResultStatuses);
const governedPipelineParseModeSet = new Set(governedPipelineParseModes);

function asProviderFamilyId(value: string): ProviderFamilyId | undefined {
  if (!providerFamilyIdSet.has(value as ProviderFamilyId)) {
    return undefined;
  }

  return value as ProviderFamilyId;
}

function asHarnessId(value: string | undefined): HarnessId | undefined {
  if (value === undefined || !harnessIdSet.has(value as HarnessId)) {
    return undefined;
  }

  return value as HarnessId;
}

function assertPreservedLabels(
  request: GovernedPipelineInvokeAgenticHarnessRequest,
): void {
  if (request.route_decision.silentDowngrade !== false) {
    throw new Error("governed-pipeline adapter must reject silent_downgrade");
  }

  if (request.route_decision.selectedHarness !== request.target_harness) {
    throw new Error("governed-pipeline adapter must preserve target_harness labels");
  }
}

function validateBlocker(
  blocker: AdapterBlocker | undefined,
): AdapterBlocker | undefined {
  if (blocker === undefined) {
    return undefined;
  }

  if (!adapterBlockerClassSet.has(blocker.class)) {
    throw new Error(`unrecognized blocker class: ${blocker.class}`);
  }

  return {
    class: blocker.class,
    summary: sanitizeMetadataText(blocker.summary, "blocker summary"),
  };
}

export function mapInvokeAgenticHarnessRequest(
  request: GovernedPipelineInvokeAgenticHarnessRequest,
): CreateSessionRequest {
  assertPreservedLabels(request);

  return {
    runtime: "omnigent",
    targetHarness: request.target_harness,
    idempotencyKey: request.request.idempotency_key,
    correlationId: request.request.correlation_id,
    targetProvider: asProviderFamilyId(request.route_decision.selectedProvider),
    identityProfileId:
      request.route_decision.selectedIdentityProfileId ??
      request.request.identity_profile_id,
    title: sanitizeMetadataText(request.request.title, "title"),
    repoRoot: request.repo_root,
    initialMessage: request.request.initial_message,
    metadata: {
      adapter: request.adapter,
      task_id: request.request.task_id,
      selected_provider: sanitizeMetadataText(
        request.route_decision.selectedProvider,
        "selected provider",
      ),
      selected_harness: sanitizeMetadataText(
        request.route_decision.selectedHarness,
        "selected harness",
      ),
      preferred_executor:
        request.request.preferred_executor ??
        asHarnessId(request.route_decision.preferredHarness),
      fallback_executor: request.request.fallback_executor,
      fallback_reason: request.route_decision.fallbackReason,
      silent_downgrade: false,
    },
  };
}

export function mapExecutorAdapterResult(
  input: GovernedPipelineAdapterResultInput,
): GovernedPipelineExecutorAdapterResult {
  assertPreservedLabels(input.request);

  if (!governedPipelineResultStatusSet.has(input.status)) {
    throw new Error(`unrecognized result status: ${input.status}`);
  }

  if (!governedPipelineParseModeSet.has(input.parse_mode)) {
    throw new Error(`unrecognized parse mode: ${input.parse_mode}`);
  }

  return {
    schema: "executor_adapter_result.v0.1",
    executor: "omnigent",
    target_harness: input.request.target_harness,
    provider: sanitizeMetadataText(
      input.request.route_decision.selectedProvider,
      "selected provider",
    ),
    model:
      input.model === undefined
        ? undefined
        : sanitizeMetadataText(input.model, "model"),
    status: input.status,
    transport_ok: input.transport_ok,
    parse_ok: input.parse_ok,
    parse_mode: input.parse_mode,
    unavailable_reason:
      input.unavailable_reason === undefined
        ? undefined
        : sanitizeMetadataText(
            input.unavailable_reason,
            "unavailable reason",
          ),
    blocker: validateBlocker(input.blocker),
    log_excerpt:
      input.log_excerpt === undefined
        ? undefined
        : redactUntrustedText(input.log_excerpt, {
            label: "log excerpt",
          }),
    policy: {
      preferred_executor:
        input.request.request.preferred_executor ??
        asHarnessId(input.request.route_decision.preferredHarness),
      fallback_executor: input.request.request.fallback_executor,
      fallback_reason: input.request.route_decision.fallbackReason,
      silent_downgrade: false,
    },
    runtime_ledger_citations: input.runtime_ledger_citations,
  };
}
