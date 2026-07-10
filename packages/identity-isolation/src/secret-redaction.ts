import {
  redactConfigRecord,
  redactConfigValue,
  type RedactedConfigValue,
} from "@consiliency/runtime-provider";

import { IdentityIsolationError } from "./types.js";

export interface SecretLeak {
  readonly path: string;
  readonly reason: string;
  readonly sample: string;
}

export interface SecretLeakScanResult {
  readonly ok: boolean;
  readonly leaks: SecretLeak[];
}

const secretValuePatterns: Array<{
  readonly reason: string;
  readonly pattern: RegExp;
}> = [
  {
    reason: "bearer_token",
    pattern: /\bbearer\s+[a-z0-9._~+/=-]{8,}/i,
  },
  {
    reason: "api_key_token",
    pattern: /\b(?:sk|gh[pousr]|xox[baprs]?)-?[a-z0-9._-]{8,}\b/i,
  },
  {
    reason: "auth_assignment",
    pattern: /\b(?:password|token|credential|authorization|api_key)\s*=\s*\S+/i,
  },
  {
    reason: "secret_env_assignment",
    pattern:
      /\bOMNIGENT_[A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|CREDENTIAL|PASSWORD|KEY)\s*=\s*\S+/i,
  },
  {
    reason: "auth_header",
    pattern: /^authorization:\s*\S+/i,
  },
];

function formatPath(path: readonly (string | number)[]): string {
  return path.reduce<string>((current, segment) => {
    if (typeof segment === "number") {
      return `${current}[${segment}]`;
    }
    return `${current}.${segment}`;
  }, "$");
}

function truncateSample(value: string): string {
  return value.length > 48 ? `${value.slice(0, 48)}...` : value;
}

function isPlainRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRedactedConfig(value: unknown): value is RedactedConfigValue {
  return (
    isPlainRecord(value) &&
    value.schema === "redacted_config_value.v0.1" &&
    value.value === "[redacted]"
  );
}

function isSensitiveFieldName(name: string): boolean {
  const normalized = name.toLowerCase();
  return (
    normalized === "password" ||
    normalized === "token" ||
    normalized === "credential" ||
    normalized === "authorization" ||
    normalized === "authheader" ||
    normalized === "auth_header" ||
    normalized === "api_key" ||
    normalized === "apikey" ||
    normalized.endsWith("_token") ||
    normalized.endsWith("_password") ||
    normalized.endsWith("_credential") ||
    normalized.endsWith("_api_key")
  );
}

function isEnvDump(value: unknown): value is Record<string, string> {
  return (
    isPlainRecord(value) &&
    Object.keys(value).length > 0 &&
    Object.values(value).every(
      (entry) => typeof entry === "string" || entry === undefined,
    )
  );
}

function pushLeak(
  leaks: SecretLeak[],
  path: readonly (string | number)[],
  reason: string,
  sample: string,
): void {
  leaks.push({
    path: formatPath(path),
    reason,
    sample: truncateSample(sample),
  });
}

function scanValue(
  value: unknown,
  path: readonly (string | number)[],
  leaks: SecretLeak[],
): void {
  if (typeof value === "string") {
    for (const rule of secretValuePatterns) {
      if (rule.pattern.test(value)) {
        pushLeak(leaks, path, rule.reason, value);
      }
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      scanValue(entry, [...path, index], leaks);
    });
    return;
  }

  if (!isPlainRecord(value) || isRedactedConfig(value)) {
    return;
  }

  for (const [key, entry] of Object.entries(value)) {
    const nextPath = [...path, key];

    if (
      (key === "env" || key === "environment") &&
      isEnvDump(entry)
    ) {
      pushLeak(leaks, nextPath, "full_env_dump", JSON.stringify(entry));
    }

    if (isSensitiveFieldName(key) && typeof entry === "string") {
      pushLeak(leaks, nextPath, "sensitive_field", entry);
    }

    scanValue(entry, nextPath, leaks);
  }
}

export function scanForSecretLeaks(value: unknown): SecretLeakScanResult {
  const leaks: SecretLeak[] = [];
  scanValue(value, [], leaks);
  return {
    ok: leaks.length === 0,
    leaks,
  };
}

export function assertNoSecretLeaks(value: unknown): void {
  const result = scanForSecretLeaks(value);
  if (result.ok) {
    return;
  }

  throw new IdentityIsolationError(
    "secret_leak_detected",
    "Rejected raw secret material before metadata-only persistence.",
    {
      leakCount: result.leaks.length,
      firstLeakPath: result.leaks[0]?.path,
      reasons: result.leaks.map((leak) => leak.reason),
    },
  );
}

export function redactSecretLikeValue(
  reason = "secret_ref",
  updatedAt?: string,
): RedactedConfigValue {
  return redactConfigValue(reason, updatedAt);
}

export function redactSecretLikeRecord(
  values: Record<string, string | undefined>,
  reason = "secret_ref",
): Record<string, RedactedConfigValue> {
  return redactConfigRecord(values, reason);
}
