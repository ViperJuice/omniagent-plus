import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { parseArgs } from "node:util";

import { sanitizeWorkspacePath } from "@omniagent-plus/core-contracts";

import { createCliError } from "./errors.js";
import type { CliCommandKey } from "./types.js";

type ParseConfigOptions = NonNullable<Parameters<typeof parseArgs>[0]>["options"];

export interface ParsedCliBase {
  readonly command: CliCommandKey;
  readonly json: boolean;
  readonly repoRoot: string;
  readonly stateRoot: string;
  readonly profilesDir: string;
}

export interface ParsedHealthRequest extends ParsedCliBase {
  readonly command: "health";
}

export interface ParsedSessionsListRequest extends ParsedCliBase {
  readonly command: "sessions list";
  readonly limit?: number;
}

export interface ParsedSessionsShowRequest extends ParsedCliBase {
  readonly command: "sessions show";
  readonly sessionId: string;
}

export interface ParsedControlSnapshotRequest extends ParsedCliBase {
  readonly command: "control snapshot";
}

export interface ParsedIdentitiesListRequest extends ParsedCliBase {
  readonly command: "identities list";
}

export interface ParsedIdentitiesPreflightRequest extends ParsedCliBase {
  readonly command: "identities preflight";
  readonly profileId: string;
  readonly authAvailable?: boolean;
  readonly activeSessions?: number;
  readonly activeTurns?: number;
  readonly blockedReason?: string;
}

export interface ParsedWorktreesListRequest extends ParsedCliBase {
  readonly command: "worktrees list";
}

export interface ParsedWorktreesCleanupRequest extends ParsedCliBase {
  readonly command: "worktrees cleanup";
  readonly leaseId: string;
  readonly currentHost?: string;
  readonly allowReadOnlyCleanup: boolean;
}

export interface ParsedClassifyLimitRequest extends ParsedCliBase {
  readonly command: "classify-limit";
  readonly provider?: string;
  readonly harness?: string;
  readonly statusCode?: number;
  readonly exitCode?: number;
  readonly bodyText?: string;
  readonly stderrText?: string;
  readonly stdoutText?: string;
  readonly headers: Record<string, string>;
  readonly sessionId?: string;
  readonly identityProfileId?: string;
  readonly taskId?: string;
  readonly record: boolean;
}

export interface ParsedRouteTaskRequest extends ParsedCliBase {
  readonly command: "route-task";
  readonly taskId: string;
  readonly preferredProvider?: string;
  readonly preferredHarness?: string;
  readonly preferredIdentityProfileId?: string;
  readonly classificationTaskId?: string;
  readonly worktreeLeaseId?: string;
  readonly manualConfirmationProvided: boolean;
  readonly sessionContinuation: boolean;
  readonly handoffEvidence: boolean;
  readonly rawHistoryAttached: boolean;
  readonly localFilesystemDependency: boolean;
  readonly allowCrossProviderMigration?: boolean;
  readonly record: boolean;
}

export type ParsedCliRequest =
  | ParsedHealthRequest
  | ParsedSessionsListRequest
  | ParsedSessionsShowRequest
  | ParsedControlSnapshotRequest
  | ParsedIdentitiesListRequest
  | ParsedIdentitiesPreflightRequest
  | ParsedWorktreesListRequest
  | ParsedWorktreesCleanupRequest
  | ParsedClassifyLimitRequest
  | ParsedRouteTaskRequest;

function findRepoRoot(startDir: string): string {
  let current = resolve(startDir);

  while (true) {
    if (existsSync(join(current, "pnpm-workspace.yaml"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return resolve(startDir);
    }
    current = parent;
  }
}

function sanitizePath(value: string, label: string): string {
  return sanitizeWorkspacePath(resolve(value), label);
}

function parseInteger(
  value: string | undefined,
  label: string,
  {
    minimum,
  }: {
    readonly minimum: number;
  },
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed < minimum) {
    throw createCliError("argument_error", `${label} must be an integer >= ${minimum}.`);
  }
  return parsed;
}

function pickRequiredIdentifier(
  optionValue: string | undefined,
  positionals: string[],
  label: string,
): string {
  const positional = positionals[0];
  if (optionValue && positional && optionValue !== positional) {
    throw createCliError(
      "argument_error",
      `${label} was provided twice with different values.`,
    );
  }
  const resolved = optionValue ?? positional;
  if (!resolved) {
    throw createCliError("argument_error", `${label} is required.`);
  }
  if (positionals.length > 1) {
    throw createCliError("argument_error", `Unexpected extra positional arguments for ${label}.`);
  }
  return resolved;
}

function assertNoPositionals(positionals: string[], command: string): void {
  if (positionals.length > 0) {
    throw createCliError(
      "argument_error",
      `Unexpected positional arguments for ${command}.`,
      {
        positionals,
      },
    );
  }
}

function parseHeaders(values: string[] | undefined): Record<string, string> {
  if (values === undefined) {
    return {};
  }

  return Object.fromEntries(
    values.map((value) => {
      const split = value.indexOf("=");
      if (split <= 0) {
        throw createCliError(
          "argument_error",
          "Headers must be passed as key=value pairs.",
        );
      }
      const key = value.slice(0, split).trim().toLowerCase();
      const headerValue = value.slice(split + 1).trim();
      if (!key || !headerValue) {
        throw createCliError(
          "argument_error",
          "Headers must be passed as key=value pairs.",
        );
      }
      return [key, headerValue] as const;
    }),
  );
}

function parseCommandArgs(
  args: string[],
  options: ParseConfigOptions,
): {
  readonly values: Record<string, string | boolean | string[] | undefined>;
  readonly positionals: string[];
} {
  try {
    const parsed = parseArgs({
      args,
      options,
      allowPositionals: true,
      strict: true,
    });
    return {
      values: parsed.values as Record<string, string | boolean | string[] | undefined>,
      positionals: parsed.positionals,
    };
  } catch (error) {
    if (error instanceof TypeError) {
      throw createCliError("argument_error", error.message);
    }
    throw error;
  }
}

function stripGlobalOptions(args: string[]): {
  readonly remaining: string[];
  readonly json: boolean;
  readonly stateRoot?: string;
  readonly profilesDir?: string;
} {
  const remaining: string[] = [];
  let json = false;
  let stateRoot: string | undefined;
  let profilesDir: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === undefined) {
      break;
    }

    if (token === "--json") {
      json = true;
      continue;
    }
    if (token === "--state-root") {
      const next = args[index + 1];
      if (next === undefined) {
        throw createCliError("argument_error", "--state-root requires a value.");
      }
      stateRoot = next;
      index += 1;
      continue;
    }
    if (token.startsWith("--state-root=")) {
      stateRoot = token.slice("--state-root=".length);
      continue;
    }
    if (token === "--profiles-dir") {
      const next = args[index + 1];
      if (next === undefined) {
        throw createCliError("argument_error", "--profiles-dir requires a value.");
      }
      profilesDir = next;
      index += 1;
      continue;
    }
    if (token.startsWith("--profiles-dir=")) {
      profilesDir = token.slice("--profiles-dir=".length);
      continue;
    }

    remaining.push(token);
  }

  return {
    remaining,
    json,
    stateRoot,
    profilesDir,
  };
}

function buildBase<TCommand extends CliCommandKey>(
  command: TCommand,
  cwd: string,
  globals: ReturnType<typeof stripGlobalOptions>,
): ParsedCliBase & { readonly command: TCommand } {
  const repoRoot = findRepoRoot(cwd);
  return {
    command,
    json: globals.json,
    repoRoot,
    stateRoot: sanitizePath(
      globals.stateRoot ?? join(repoRoot, ".omniagent-plus", "state"),
      "state root",
    ),
    profilesDir: sanitizePath(
      globals.profilesDir ?? join(repoRoot, "fixtures", "identity", "profiles"),
      "profiles dir",
    ),
  };
}

export function parseCliArgs(
  argv: string[],
  cwd = process.cwd(),
): ParsedCliRequest {
  const globals = stripGlobalOptions(argv);
  const [first, second, ...rest] = globals.remaining;

  if (first === undefined) {
    throw createCliError("argument_error", "A command is required.");
  }

  if (first === "health") {
    const base = buildBase("health", cwd, globals);
    const parsed = parseCommandArgs(rest, {});
    assertNoPositionals(parsed.positionals, "health");
    return base;
  }

  if (first === "sessions" && (second === "list" || second === "show")) {
    if (second === "list") {
      const base = buildBase("sessions list", cwd, globals);
      const parsed = parseCommandArgs(rest, {
        limit: { type: "string" },
      });
      assertNoPositionals(parsed.positionals, "sessions list");
      return {
        ...base,
        limit: parseInteger(parsed.values.limit as string | undefined, "limit", {
          minimum: 1,
        }),
      };
    }

    const base = buildBase("sessions show", cwd, globals);
    const parsed = parseCommandArgs(rest, {
      "session-id": { type: "string" },
    });
    return {
      ...base,
      sessionId: pickRequiredIdentifier(
        parsed.values["session-id"] as string | undefined,
        parsed.positionals,
        "session-id",
      ),
    };
  }

  if (first === "control" && second === "snapshot") {
    const base = buildBase("control snapshot", cwd, globals);
    const parsed = parseCommandArgs(rest, {});
    assertNoPositionals(parsed.positionals, "control snapshot");
    return base;
  }

  if (
    first === "identities"
    && (second === "list" || second === "preflight")
  ) {
    if (second === "list") {
      const base = buildBase("identities list", cwd, globals);
      const parsed = parseCommandArgs(rest, {});
      assertNoPositionals(parsed.positionals, "identities list");
      return base;
    }

    const base = buildBase("identities preflight", cwd, globals);
    const parsed = parseCommandArgs(rest, {
      "profile-id": { type: "string" },
      "auth-available": { type: "boolean" },
      "auth-unavailable": { type: "boolean" },
      "active-sessions": { type: "string" },
      "active-turns": { type: "string" },
      "blocked-reason": { type: "string" },
    });
    const authAvailable =
      parsed.values["auth-available"] === true
        ? true
        : parsed.values["auth-unavailable"] === true
          ? false
          : undefined;

    if (
      parsed.values["auth-available"] === true
      && parsed.values["auth-unavailable"] === true
    ) {
      throw createCliError(
        "argument_error",
        "Choose either --auth-available or --auth-unavailable.",
      );
    }

    return {
      ...base,
      profileId: pickRequiredIdentifier(
        parsed.values["profile-id"] as string | undefined,
        parsed.positionals,
        "profile-id",
      ),
      authAvailable,
      activeSessions: parseInteger(
        parsed.values["active-sessions"] as string | undefined,
        "active-sessions",
        {
          minimum: 0,
        },
      ),
      activeTurns: parseInteger(
        parsed.values["active-turns"] as string | undefined,
        "active-turns",
        {
          minimum: 0,
        },
      ),
      blockedReason: parsed.values["blocked-reason"] as string | undefined,
    };
  }

  if (
    first === "worktrees"
    && (second === "list" || second === "cleanup")
  ) {
    if (second === "list") {
      const base = buildBase("worktrees list", cwd, globals);
      const parsed = parseCommandArgs(rest, {});
      assertNoPositionals(parsed.positionals, "worktrees list");
      return base;
    }

    const base = buildBase("worktrees cleanup", cwd, globals);
    const parsed = parseCommandArgs(rest, {
      "lease-id": { type: "string" },
      "current-host": { type: "string" },
      "allow-read-only-cleanup": { type: "boolean" },
    });
    return {
      ...base,
      leaseId: pickRequiredIdentifier(
        parsed.values["lease-id"] as string | undefined,
        parsed.positionals,
        "lease-id",
      ),
      currentHost: parsed.values["current-host"] as string | undefined,
      allowReadOnlyCleanup:
        parsed.values["allow-read-only-cleanup"] === true,
    };
  }

  if (first === "classify-limit") {
    const base = buildBase("classify-limit", cwd, globals);
    const parsed = parseCommandArgs([second, ...rest].filter(Boolean) as string[], {
      provider: { type: "string" },
      harness: { type: "string" },
      "status-code": { type: "string" },
      "exit-code": { type: "string" },
      "body-text": { type: "string" },
      "stderr-text": { type: "string" },
      "stdout-text": { type: "string" },
      header: { type: "string", multiple: true },
      "session-id": { type: "string" },
      "identity-profile-id": { type: "string" },
      "task-id": { type: "string" },
      record: { type: "boolean" },
    });
    assertNoPositionals(parsed.positionals, "classify-limit");
    return {
      ...base,
      provider: parsed.values.provider as string | undefined,
      harness: parsed.values.harness as string | undefined,
      statusCode: parseInteger(
        parsed.values["status-code"] as string | undefined,
        "status-code",
        {
          minimum: 0,
        },
      ),
      exitCode: parseInteger(
        parsed.values["exit-code"] as string | undefined,
        "exit-code",
        {
          minimum: 0,
        },
      ),
      bodyText: parsed.values["body-text"] as string | undefined,
      stderrText: parsed.values["stderr-text"] as string | undefined,
      stdoutText: parsed.values["stdout-text"] as string | undefined,
      headers: parseHeaders(parsed.values.header as string[] | undefined),
      sessionId: parsed.values["session-id"] as string | undefined,
      identityProfileId:
        parsed.values["identity-profile-id"] as string | undefined,
      taskId: parsed.values["task-id"] as string | undefined,
      record: parsed.values.record === true,
    };
  }

  if (first === "route-task") {
    const base = buildBase("route-task", cwd, globals);
    const parsed = parseCommandArgs([second, ...rest].filter(Boolean) as string[], {
      "task-id": { type: "string" },
      "preferred-provider": { type: "string" },
      "preferred-harness": { type: "string" },
      "preferred-identity-profile-id": { type: "string" },
      "classification-task-id": { type: "string" },
      "worktree-lease-id": { type: "string" },
      "manual-confirmation": { type: "boolean" },
      "session-continuation": { type: "boolean" },
      "handoff-evidence": { type: "boolean" },
      "raw-history-attached": { type: "boolean" },
      "local-filesystem-dependency": { type: "boolean" },
      "allow-cross-provider-migration": { type: "boolean" },
      record: { type: "boolean" },
    });
    assertNoPositionals(parsed.positionals, "route-task");
    const taskId = parsed.values["task-id"] as string | undefined;
    if (!taskId) {
      throw createCliError("argument_error", "task-id is required.");
    }
    return {
      ...base,
      taskId,
      preferredProvider:
        parsed.values["preferred-provider"] as string | undefined,
      preferredHarness:
        parsed.values["preferred-harness"] as string | undefined,
      preferredIdentityProfileId:
        parsed.values["preferred-identity-profile-id"] as string | undefined,
      classificationTaskId:
        parsed.values["classification-task-id"] as string | undefined,
      worktreeLeaseId:
        parsed.values["worktree-lease-id"] as string | undefined,
      manualConfirmationProvided:
        parsed.values["manual-confirmation"] === true,
      sessionContinuation:
        parsed.values["session-continuation"] === true,
      handoffEvidence: parsed.values["handoff-evidence"] === true,
      rawHistoryAttached:
        parsed.values["raw-history-attached"] === true,
      localFilesystemDependency:
        parsed.values["local-filesystem-dependency"] === true,
      allowCrossProviderMigration:
        parsed.values["allow-cross-provider-migration"] === true
          ? true
          : undefined,
      record: parsed.values.record === true,
    };
  }

  throw createCliError("argument_error", `Unknown command: ${first}${second ? ` ${second}` : ""}.`);
}
