import type { LimitClassification } from "@consiliency/runtime-provider";

import {
  buildClassification,
  matchBaseClassification,
  sanitizeSignal,
} from "./rules.js";
import type { ClassifierInput } from "./types.js";

export function classifyLimitSignal(input: ClassifierInput): LimitClassification {
  const signal = sanitizeSignal(input);
  const match = matchBaseClassification(signal);
  return buildClassification(input, signal, match);
}
