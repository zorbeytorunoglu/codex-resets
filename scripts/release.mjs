#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const USAGE = [
  "Usage:",
  "  npm run release -- <patch|minor|major|version> --notes <text> [--notes <text> ...] [--yes]",
  "",
  "Examples:",
  "  npm run release -- patch --notes \"Fix expiry warning formatting\"",
  "  npm run release -- 0.2.0 --notes \"Add JSON output\" --yes",
  "",
  "Without --yes this is a dry run. With --yes it updates files, runs CI,",
  "commits, tags, and pushes main plus the release tag.",
].join("\n");

function fail(message) {
  console.error("release: " + message);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {
    target: null,
    notes: [],
    yes: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--yes") {
      parsed.yes = true;
    } else if (arg === "--notes" || arg === "--note") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) {
        fail("missing value for " + arg);
      }
      parsed.notes.push(value);
      index += 1;
    } else if (arg.startsWith("--notes=")) {
      parsed.notes.push(arg.slice("--notes=".length));
    } else if (arg.startsWith("--note=")) {
      parsed.notes.push(arg.slice("--note=".length));
    } else if (arg.startsWith("-")) {
      fail("unknown option: " + arg);
    } else if (parsed.target === null) {
      parsed.target = arg;
    } else {
      fail("unexpected argument: " + arg);
    }
  }

  return parsed;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture || options.allowFailure ? "pipe" : "inherit",
  });

  if (result.status !== 0 && !options.allowFailure) {
    process.exit(result.status ?? 1);
  }

  if (options.capture) {
    return (result.stdout || "").trim();
  }

  return result;
}

function git(args, options = {}) {
  return run("git", args, options);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n");
}

function parseStableVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function resolveNextVersion(currentVersion, target) {
  if (/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(target)) {
    return target;
  }

  const current = parseStableVersion(currentVersion);
  if (current === null) {
    fail("cannot bump non-stable current version " + currentVersion + "; pass an explicit version");
  }

  if (target === "patch") {
    return current.major + "." + current.minor + "." + (current.patch + 1);
  }
  if (target === "minor") {
    return current.major + "." + (current.minor + 1) + ".0";
  }
  if (target === "major") {
    return current.major + 1 + ".0.0";
  }

  fail("target must be patch, minor, major, or an explicit semver version");
}

function assertCleanWorktree() {
  const status = git(["status", "--porcelain"], { capture: true });
  if (status !== "") {
    fail("worktree is not clean; commit or stash changes first");
  }
}

function assertOnMain() {
  const branch = git(["branch", "--show-current"], { capture: true });
  if (branch !== "main") {
    fail("release must run from main, current branch is " + branch);
  }
}

function assertSyncedWithOrigin() {
  git(["fetch", "origin", "main", "--tags"]);
  const head = git(["rev-parse", "HEAD"], { capture: true });
  const originMain = git(["rev-parse", "origin/main"], { capture: true });
  if (head !== originMain) {
    fail("local main is not synced with origin/main");
  }
}

function assertVersionAvailable(packageName, version) {
  const tag = "v" + version;
  const localTag = git(["tag", "--list", tag], { capture: true });
  if (localTag !== "") {
    fail("local git tag already exists: " + tag);
  }

  const remoteTag = git(["ls-remote", "--tags", "origin", tag], { capture: true });
  if (remoteTag !== "") {
    fail("remote git tag already exists: " + tag);
  }

  const npmResult = run("npm", ["view", packageName + "@" + version, "version"], {
    allowFailure: true,
  });
  if (npmResult.status === 0) {
    fail(packageName + "@" + version + " is already published on npm");
  }
}

function updateChangelog(version, notes) {
  const path = "CHANGELOG.md";
  const text = readFileSync(path, "utf8");
  const heading = "## " + version;
  if (text.includes(heading)) {
    fail("CHANGELOG.md already contains " + heading);
  }

  const entry = heading + "\n\n" + notes.map((note) => "- " + note).join("\n") + "\n\n";
  if (!text.startsWith("# Changelog\n\n")) {
    fail("CHANGELOG.md must start with '# Changelog'");
  }

  writeFileSync(path, "# Changelog\n\n" + entry + text.slice("# Changelog\n\n".length));
}

function updateVersionFiles(version, notes) {
  const packageJson = readJson("package.json");
  packageJson.version = version;
  writeJson("package.json", packageJson);

  const packageLock = readJson("package-lock.json");
  packageLock.version = version;
  if (packageLock.packages && packageLock.packages[""]) {
    packageLock.packages[""].version = version;
  }
  writeJson("package-lock.json", packageLock);

  writeFileSync("src/version.js", "export const VERSION = \"" + version + "\";\n");
  updateChangelog(version, notes);
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }

  if (args.target === null) {
    console.log(USAGE);
    fail("missing release target");
  }

  if (args.notes.length === 0) {
    fail("at least one --notes entry is required so CHANGELOG.md is meaningful");
  }

  const packageJson = readJson("package.json");
  const nextVersion = resolveNextVersion(packageJson.version, args.target);
  const tag = "v" + nextVersion;

  console.log("Current version: " + packageJson.version);
  console.log("Next version:    " + nextVersion);
  console.log("Tag:             " + tag);
  console.log("Notes:");
  for (const note of args.notes) {
    console.log("  - " + note);
  }

  if (!args.yes) {
    console.log("");
    console.log("Dry run only. Re-run with --yes to update files, commit, tag, and push.");
    return;
  }

  assertCleanWorktree();
  assertOnMain();
  assertSyncedWithOrigin();
  assertVersionAvailable(packageJson.name, nextVersion);
  updateVersionFiles(nextVersion, args.notes);

  run("npm", ["run", "ci"]);
  git(["add", "package.json", "package-lock.json", "src/version.js", "CHANGELOG.md"]);
  git(["commit", "-m", "Release " + tag]);
  git(["tag", tag]);
  git(["push", "origin", "main", tag]);

  console.log("");
  console.log("Release tag pushed. GitHub Actions will publish " + packageJson.name + "@" + nextVersion + ".");
}

main();
