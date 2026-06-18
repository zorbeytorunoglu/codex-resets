import { loadAuth } from "./auth.js";
import { fetchResetCredits, parseResetCredits } from "./api.js";
import { CodexResetsError } from "./errors.js";
import { formatReport, toPublicJson } from "./format.js";
import { VERSION } from "./version.js";

const DEFAULT_WARN_HOURS = 48;

function helpText() {
  return [
    "Usage: codex-resets [options]",
    "",
    "Show Codex reset-credit grant and expiry dates.",
    "",
    "Options:",
    "  --json                 Print stable redacted JSON for scripts",
    "  --raw                  Print raw endpoint response; do not share blindly",
    "  --warn-hours <hours>   Warn when a reset expires within this many hours",
    "                         Default: 48",
    "  --auth <path>          Read a specific Codex auth.json file",
    "  -h, --help             Show help",
    "  -v, --version          Show version",
  ].join("\n");
}

function readValue(argv, index, name) {
  const next = argv[index + 1];
  if (typeof next !== "string" || next.startsWith("-")) {
    throw new CodexResetsError("Missing value for " + name + ".");
  }

  return next;
}

function parseWarnHours(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new CodexResetsError("--warn-hours must be a non-negative number.");
  }

  return parsed;
}

export function parseCliArgs(argv) {
  const options = {
    authPath: null,
    json: false,
    raw: false,
    warnHours: DEFAULT_WARN_HOURS,
    help: false,
    version: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--json") {
      options.json = true;
    } else if (arg === "--raw") {
      options.raw = true;
    } else if (arg === "--auth") {
      options.authPath = readValue(argv, index, "--auth");
      index += 1;
    } else if (arg.startsWith("--auth=")) {
      options.authPath = arg.slice("--auth=".length);
    } else if (arg === "--warn-hours") {
      options.warnHours = parseWarnHours(readValue(argv, index, "--warn-hours"));
      index += 1;
    } else if (arg.startsWith("--warn-hours=")) {
      options.warnHours = parseWarnHours(arg.slice("--warn-hours=".length));
    } else if (arg === "-h" || arg === "--help") {
      options.help = true;
    } else if (arg === "-v" || arg === "--version") {
      options.version = true;
    } else {
      throw new CodexResetsError("Unknown option: " + arg);
    }
  }

  if (options.json && options.raw) {
    throw new CodexResetsError("Use either --json or --raw, not both.");
  }

  return options;
}

function write(stream, value) {
  stream.write(value.endsWith("\n") ? value : value + "\n");
}

export async function main(argv, {
  stdout = process.stdout,
  stderr = process.stderr,
  env = process.env,
  homeDir = undefined,
  readFileFn = undefined,
  fetchFn = globalThis.fetch,
  now = new Date(),
} = {}) {
  try {
    const options = parseCliArgs(argv);

    if (options.help) {
      write(stdout, helpText());
      return 0;
    }

    if (options.version) {
      write(stdout, VERSION);
      return 0;
    }

    const auth = await loadAuth({
      authPath: options.authPath,
      env,
      homeDir,
      readFileFn,
    });

    const data = await fetchResetCredits({
      accessToken: auth.accessToken,
      accountId: auth.accountId,
      fetchFn,
    });

    if (options.raw) {
      write(stderr, "WARNING: raw output may include account-specific metadata. Do not share blindly.");
      write(stdout, JSON.stringify(data, null, 2));
      return 0;
    }

    const report = parseResetCredits(data);
    if (options.json) {
      write(stdout, JSON.stringify(toPublicJson(report, { now, warnHours: options.warnHours }), null, 2));
    } else {
      write(stdout, formatReport(report, { now, warnHours: options.warnHours }));
    }

    return 0;
  } catch (error) {
    if (error instanceof CodexResetsError) {
      write(stderr, "codex-resets: " + error.message);
      write(stderr, "codex-resets: run codex-resets --help for usage.");
      return 1;
    }

    write(stderr, "codex-resets: unexpected error: " + error.message);
    return 1;
  }
}
