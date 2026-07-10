import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  identityProfileSchema,
  type IdentityProfile,
} from "@consiliency/runtime-provider";

import { assertNoSecretLeaks } from "./secret-redaction.js";
import { detectIdentityProfileKind, type IdentityProfileKind } from "./types.js";

export interface LoadedIdentityProfile {
  readonly fileName: string;
  readonly path: string;
  readonly profile: IdentityProfile;
  readonly kind: IdentityProfileKind;
}

function toFilesystemPath(pathRef: string | URL): string {
  return pathRef instanceof URL ? fileURLToPath(pathRef) : pathRef;
}

function joinPath(root: string | URL, fileName: string): string | URL {
  return root instanceof URL ? new URL(fileName, root) : join(root, fileName);
}

export async function loadIdentityProfile(
  pathRef: string | URL,
): Promise<LoadedIdentityProfile> {
  const path = toFilesystemPath(pathRef);
  const raw = await readFile(pathRef, "utf8");
  const parsed = identityProfileSchema.parse(JSON.parse(raw)) as IdentityProfile;

  assertNoSecretLeaks(parsed);

  return {
    fileName: path.split("/").at(-1) ?? path,
    path,
    profile: parsed,
    kind: detectIdentityProfileKind(parsed),
  };
}

export async function listIdentityProfiles(
  directory: string | URL,
): Promise<LoadedIdentityProfile[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const profileFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name)
    .sort();

  return Promise.all(
    profileFiles.map((fileName) =>
      loadIdentityProfile(joinPath(directory, fileName)),
    ),
  );
}
