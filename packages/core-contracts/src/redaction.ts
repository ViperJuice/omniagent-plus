import { z } from "zod";

export const redactionStatuses = [
  "metadata_only",
  "content_allowed",
  "content_redacted",
] as const;
export type RedactionStatus = (typeof redactionStatuses)[number];

export const redactionStatusSchema = z.enum(redactionStatuses);

export interface RuntimeEvidenceRef {
  readonly kind: "file" | "log" | "command" | "test" | "diff";
  readonly label: string;
  readonly path?: string;
  readonly excerpt?: string;
}

export const runtimeEvidenceRefSchema = z.object({
  kind: z.enum(["file", "log", "command", "test", "diff"]),
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

export const redactedConfigValueSchema = z.object({
  schema: z.literal("redacted_config_value.v0.1"),
  value: z.literal("[redacted]"),
  reason: z.string().min(1),
  updatedAt: z.string().datetime({ offset: true }).optional(),
});

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
