import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  runtimeEventSchema,
  runtimeFailureCategories,
  sessionTransitionTable,
  turnTransitionTable,
  type AgentRuntimeProvider,
  type AgentSessionState,
  type TurnState,
} from "@omniagent-plus/core-contracts";

/**
 * L-TSCONFORM (IF-0-PUBHARDEN-1) — the load-bearing pre-publish gate.
 *
 * Asserts the `@omniagent-plus` TypeScript contract conforms to the frozen
 * IF-0-CONFORM-1 golden (`conformance.v0.1.json`) across all four invariant tables,
 * BEFORE publish, so a TS<->golden mismatch can never surface only in gp and force a
 * republish. The golden is read from the package-local `./conformance` copy this
 * package ships. A one-string mutation in a scratch copy must make it fail.
 *
 * Method names are additionally bound at COMPILE time (see the `_AssertMethodNames`
 * type below): `keyof AgentRuntimeProvider` must equal `TS_METHOD_NAMES`, so adding or
 * renaming an interface method breaks `tsc` typecheck until both this list and the
 * golden are updated. The runtime check then binds the golden to `TS_METHOD_NAMES`.
 */

interface GoldenShape {
  methodNames: string[];
  methodNameMapping: Array<{ ts: string; py: string }>;
  eventTypes: string[];
  terminalStates: { turn: string[]; session: string[] };
  errorCategories: string[];
}

// --- compile-time bind: keyof AgentRuntimeProvider === TS_METHOD_NAMES union ---
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;
type Expect<T extends true> = T;

const TS_METHOD_NAMES = [
  "createSession",
  "sendTurn",
  "readHistory",
  "streamEvents",
  "cancelTurn",
  "closeSession",
  "getSessionInfo",
  "health",
] as const;
type TsMethodName = (typeof TS_METHOD_NAMES)[number];

// If the interface gains/loses/renames a method, this fails to typecheck.
type _AssertMethodNames = Expect<Equal<keyof AgentRuntimeProvider, TsMethodName>>;

const goldenUrl = new URL("../conformance.v0.1.json", import.meta.url);

function loadGolden(): GoldenShape {
  return JSON.parse(readFileSync(fileURLToPath(goldenUrl), "utf8")) as GoldenShape;
}

function tsEventTypes(): string[] {
  // Each member of the discriminated union pins its `type` as a zod literal.
  return runtimeEventSchema.options.map(
    (member) => (member.shape.type as { value: string }).value,
  );
}

function tsTerminalStates(): { turn: string[]; session: string[] } {
  const turn = (Object.entries(turnTransitionTable) as [TurnState, readonly TurnState[]][])
    .filter(([, next]) => next.length === 0)
    .map(([state]) => state);
  const session = (
    Object.entries(sessionTransitionTable) as [AgentSessionState, readonly AgentSessionState[]][]
  )
    .filter(([, next]) => next.length === 0)
    .map(([state]) => state);
  return { turn, session };
}

/**
 * Assert the golden conforms to the TS contract. Throws on any table mismatch, so a
 * scratch-copy mutation of a golden string makes the mutation test's `toThrow` pass.
 */
function assertGoldenConformsToTs(golden: GoldenShape): void {
  // 1. methods — resolve each golden name via the mapping (EXACT key, either spelling)
  //    to its canonical camelCase (ts) name, then require set-equality with TS_METHOD_NAMES.
  const resolver = new Map<string, string>();
  for (const pair of golden.methodNameMapping) {
    resolver.set(pair.ts, pair.ts);
    resolver.set(pair.py, pair.ts);
  }
  const resolvedTs = new Set<string>();
  for (const name of golden.methodNames) {
    const canonical = resolver.get(name); // exact match only — undeclared spellings miss
    if (canonical === undefined) {
      throw new Error(`golden method ${name} is not an exact ts/py spelling in the mapping`);
    }
    resolvedTs.add(canonical);
  }
  expectSetEqual("methodNames", resolvedTs, new Set<string>(TS_METHOD_NAMES));

  // 2. events — the discriminated-union member type literals.
  expectSetEqual("eventTypes", new Set(golden.eventTypes), new Set(tsEventTypes()));

  // 3. terminal states — empty-successor entries of the transition tables.
  const tsTerminals = tsTerminalStates();
  expectSetEqual("terminalStates.turn", new Set(golden.terminalStates.turn), new Set(tsTerminals.turn));
  expectSetEqual(
    "terminalStates.session",
    new Set(golden.terminalStates.session),
    new Set(tsTerminals.session),
  );

  // 4. error categories — the exported runtimeFailureCategories array.
  expectSetEqual("errorCategories", new Set(golden.errorCategories), new Set(runtimeFailureCategories));
}

function expectSetEqual(label: string, a: Set<string>, b: Set<string>): void {
  const onlyA = [...a].filter((x) => !b.has(x));
  const onlyB = [...b].filter((x) => !a.has(x));
  if (onlyA.length > 0 || onlyB.length > 0) {
    throw new Error(
      `${label} mismatch — golden-only=${JSON.stringify(onlyA)} ts-only=${JSON.stringify(onlyB)}`,
    );
  }
}

describe("TS-vs-golden conformance (IF-0-PUBHARDEN-1, pre-publish)", () => {
  it("the @omniagent-plus TS contract conforms to the IF-0-CONFORM-1 golden", () => {
    assertGoldenConformsToTs(loadGolden());
  });

  it("a one-string golden mutation fails the TS-vs-golden check (bites)", () => {
    const mutated = structuredClone(loadGolden());
    mutated.eventTypes[0] = "runtime.MUTATED";
    expect(() => assertGoldenConformsToTs(mutated)).toThrow(/eventTypes mismatch/);
  });

  it("an undeclared method spelling fails the TS-vs-golden check (mapping pins spelling)", () => {
    const mutated = structuredClone(loadGolden());
    const idx = mutated.methodNames.indexOf("createSession");
    mutated.methodNames[idx] = "CREATE_SESSION";
    expect(() => assertGoldenConformsToTs(mutated)).toThrow(/not an exact ts\/py spelling/);
  });
});
