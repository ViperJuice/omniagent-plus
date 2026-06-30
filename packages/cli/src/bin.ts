import { COMMAND_REGISTRY } from "./command-registry.js";
import { runCli } from "./runtime.js";

const argv = process.argv.slice(2);
const exitCode = await runCli(
  argv[0] === "--" ? argv.slice(1) : argv,
  COMMAND_REGISTRY,
);
process.exitCode = exitCode;
