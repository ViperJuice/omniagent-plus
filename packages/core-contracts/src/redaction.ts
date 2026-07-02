import { isAbsolute, posix } from "node:path";

import { z } from "zod";

export const redactionStatuses = [
  "metadata_only",
  "content_allowed",
  "content_redacted",
] as const;
export type RedactionStatus = (typeof redactionStatuses)[number];

export const DEFAULT_METADATA_TEXT_MAX_BYTES = 280;
export const DEFAULT_UNTRUSTED_TEXT_MAX_BYTES = 2048;

const secretTextPatterns: Array<{
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
    reason: "private_key",
    pattern: /-----BEGIN [A-Z ]+PRIVATE KEY-----/,
  },
];

const secretPathPatterns = [
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)\.ssh(\/|$)/,
  /(^|\/)(?:secrets?|credentials?|private)(\/|$)/i,
  /(^|\/)id_(?:rsa|ed25519)(?:\.pub)?$/i,
  /\.(?:pem|p12|key)$/i,
] as const;

const providerPayloadPatterns = [
  /"choices"\s*:/,
  /"anthropic_version"\s*:/,
  /"candidates"\s*:/,
  /"providerPayload"\s*:/i,
  /"messages"\s*:\s*\[/,
] as const;

const envDumpPattern = /(^|\n)(?:HOME|PATH|PWD|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY|AZURE_OPENAI_API_KEY|OMNIGENT_[A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|CREDENTIAL|PASSWORD|KEY))=/m;

export const redactionStatusSchema = z.enum(redactionStatuses);

export const runtimeEvidenceKinds = [
  "file",
  "log",
  "command",
  "test",
  "diff",
] as const;

export interface RuntimeEvidenceRef {
  readonly kind: (typeof runtimeEvidenceKinds)[number];
  readonly label: string;
  readonly path?: string;
  readonly excerpt?: string;
}

export const runtimeEvidenceRefSchema = z.object({
  kind: z.enum(runtimeEvidenceKinds),
  label: z.string().min(1),
  path: z.string().min(1).optional(),
  excerpt: z.string().min(1).optional(),
});

export interface RedactedConfigValue {
  readonly schema: "redacted_config_value.v0.1";
  readonly value: "[redacted]";
  readonly reason: string;
  readonly updatedAt?: string;
}

export interface RedactedText {
  readonly schema: "redacted_text.v0.1";
  readonly redaction: "content_redacted";
  readonly reason: string;
  readonly content: string;
  readonly byteLength: number;
  readonly truncated: boolean;
}

export const redactedConfigValueSchema = z.object({
  schema: z.literal("redacted_config_value.v0.1"),
  value: z.literal("[redacted]"),
  reason: z.string().min(1),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

export const redactedTextSchema = z.object({
  schema: z.literal("redacted_text.v0.1"),
  redaction: z.literal("content_redacted"),
  reason: z.string().min(1),
  content: z.string().min(1),
  byteLength: z.number().int().positive(),
  truncated: z.literal(false),
});

function normalizeText(value: string, label: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`${label} must not be empty.`);
  }

  return normalized;
}

function assertMaxBytes(value: string, label: string, maxBytes: number): void {
  const byteLength = Buffer.byteLength(value, "utf8");
  if (byteLength > maxBytes) {
    throw new Error(`${label} exceeds ${maxBytes} bytes (${byteLength} bytes).`);
  }
}

export function isSecretLikePath(pathValue: string): boolean {
  return secretPathPatterns.some((pattern) => pattern.test(pathValue));
}

export function sanitizeMetadataText(
  value: string,
  label: string,
  maxBytes = DEFAULT_METADATA_TEXT_MAX_BYTES,
): string {
  const normalized = normalizeText(value, label);
  assertMaxBytes(normalized, label, maxBytes);

  if (envDumpPattern.test(normalized)) {
    throw new Error(`${label} must not contain environment dump content.`);
  }

  if (providerPayloadPatterns.some((pattern) => pattern.test(normalized))) {
    throw new Error(`${label} must not contain raw provider payload content.`);
  }

  for (const rule of secretTextPatterns) {
    if (rule.pattern.test(normalized)) {
      throw new Error(`${label} contains ${rule.reason}.`);
    }
  }

  return normalized;
}

export function sanitizeMetadataPath(pathValue: string): string {
  const normalized = sanitizeMetadataText(pathValue, "path");
  const posixPath = normalized.replaceAll("\\", "/");
  const collapsed = posix.normalize(posixPath);

  if (isAbsolute(normalized) || posixPath.startsWith("/")) {
    throw new Error("Evidence paths must be repo-relative metadata, not absolute paths.");
  }

  if (collapsed === ".." || collapsed.startsWith("../")) {
    throw new Error("Evidence paths must not traverse outside the repository.");
  }

  if (isSecretLikePath(collapsed)) {
    throw new Error("Evidence paths must not reference secret-bearing locations.");
  }

  return collapsed;
}

export function sanitizeWorkspacePath(pathValue: string, label: string): string {
  const normalized = sanitizeMetadataText(
    pathValue,
    label,
    DEFAULT_UNTRUSTED_TEXT_MAX_BYTES,
  );
  const posixPath = normalized.replaceAll("\\", "/");

  if (isSecretLikePath(posixPath)) {
    throw new Error(`${label} must not reference secret-bearing locations.`);
  }

  return normalized;
}

export function redactUntrustedText(
  value: string,
  options: {
    readonly label?: string;
    readonly reason?: string;
    readonly maxBytes?: number;
  } = {},
): RedactedText {
  const label = options.label ?? "untrusted evidence";
  const normalized = normalizeText(value, label);
  const maxBytes = options.maxBytes ?? DEFAULT_UNTRUSTED_TEXT_MAX_BYTES;

  assertMaxBytes(normalized, label, maxBytes);

  if (envDumpPattern.test(normalized)) {
    throw new Error(`${label} must not include environment dump content.`);
  }

  if (providerPayloadPatterns.some((pattern) => pattern.test(normalized))) {
    throw new Error(`${label} must not include raw provider payload content.`);
  }

  for (const rule of secretTextPatterns) {
    if (rule.pattern.test(normalized)) {
      throw new Error(`${label} contains ${rule.reason}.`);
    }
  }

  return redactedTextSchema.parse({
    schema: "redacted_text.v0.1",
    redaction: "content_redacted",
    reason: options.reason ?? "untrusted_evidence_excerpt",
    content: normalized,
    byteLength: Buffer.byteLength(normalized, "utf8"),
    truncated: false,
  });
}

export function redactConfigValue(
  reason = "sensitive",
  updatedAt?: string,
): RedactedConfigValue {
  return {
    schema: "redacted_config_value.v0.1",
    value: "[redacted]",
    reason,
    updatedAt,
  };
}

export function redactConfigRecord(
  values: Record<string, string | undefined>,
  reason = "sensitive",
): Record<string, RedactedConfigValue> {
  return Object.fromEntries(
    Object.keys(values).map((key) => [key, redactConfigValue(reason)]),
  );
}
