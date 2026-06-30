import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const packageRoot = new URL("../", import.meta.url);
const allowedPackageImports = new Set(["@omniagent-plus/core-contracts"]);
const disallowedImportPatterns = [
  /^(?!\.{1,2}\/).*agent-harness/i,
  /^(?!\.{1,2}\/).*phase[_-]loop/i,
  /\.phase-loop\//,
];

function collectImportSpecifiers(rootPath: string): string[] {
  return readdirSync(rootPath)
    .filter((entry) => entry.endsWith(".ts"))
    .flatMap((entry) => {
      const source = readFileSync(join(rootPath, entry), "utf8");
      return [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
        (match) => match[1]!,
      );
    });
}

describe("dependency direction", () => {
  it("keeps the adapter package on public provider contracts and local fixtures only", () => {
    const packageJson = JSON.parse(
      readFileSync(new URL("../package.json", import.meta.url), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
    };
    const dependencies = Object.keys(packageJson.dependencies ?? {});
    const importSpecifiers = collectImportSpecifiers(
      new URL("./", import.meta.url).pathname,
    );

    expect(dependencies.every((entry) => allowedPackageImports.has(entry))).toBe(
      true,
    );

    for (const specifier of importSpecifiers) {
      const allowed =
        specifier.startsWith("./") ||
        specifier.startsWith("../") ||
        specifier.startsWith("node:") ||
        specifier === "vitest" ||
        allowedPackageImports.has(specifier);
      expect(allowed).toBe(true);

      for (const pattern of disallowedImportPatterns) {
        expect(pattern.test(specifier)).toBe(false);
      }
    }

    expect(packageRoot.pathname).toContain("/packages/governed-pipeline-adapter/");
  });
});
