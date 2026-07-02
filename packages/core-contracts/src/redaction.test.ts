import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import {
  redactUntrustedText,
  sanitizeMetadataPath,
  sanitizeMetadataText,
} from "./redaction.js";

function readFixture<T>(path: string): T {
  return JSON.parse(
    readFileSync(new URL(`../../../fixtures/handoff/redaction/${path}`, import.meta.url), "utf8"),
  ) as T;
}

describe("handoff redaction helpers", () => {
  it("accepts bounded untrusted excerpts and metadata-only summaries", () => {
    const fixture = readFixture<{ excerpt: string; summary: string; path: string }>(
      "safe-untrusted.json",
    );

    const redacted = redactUntrustedText(fixture.excerpt, {
      label: "fixture.excerpt",
      reason: "test_excerpt",
    });

    expect(redacted.content).toContain("Quoted evidence only");
    expect(sanitizeMetadataText(fixture.summary, "fixture.summary")).toBe(
      fixture.summary,
    );
    expect(sanitizeMetadataPath(fixture.path)).toBe(fixture.path);
  });

  it("rejects secret-bearing excerpts, env dumps, provider payloads, and absolute secret paths", () => {
    const secretFixture = readFixture<{ excerpt: string }>("secret-bearing.json");
    const envFixture = readFixture<{ excerpt: string }>("env-dump.json");
    const providerFixture = readFixture<{ excerpt: string }>("provider-payload.json");
    const pathFixture = readFixture<{ path: string }>("absolute-secret-path.json");

    expect(() =>
      redactUntrustedText(secretFixture.excerpt, { label: "secretFixture.excerpt" }),
    ).toThrow(/contains/);
    expect(() =>
      redactUntrustedText(envFixture.excerpt, { label: "envFixture.excerpt" }),
    ).toThrow(/environment dump/);
    expect(() =>
      sanitizeMetadataText(
        "OMNIGENT_ANTHROPIC_API_KEY=[redacted]",
        "omnigentEnv",
      ),
    ).toThrow(/environment dump|secret_env_assignment/);
    expect(() =>
      redactUntrustedText(providerFixture.excerpt, {
        label: "providerFixture.excerpt",
      }),
    ).toThrow(/provider payload/);
    expect(() => sanitizeMetadataPath(pathFixture.path)).toThrow(/absolute paths/);
  });
});
