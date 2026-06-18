import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const roots = ["bin", "src", "test", "scripts"];
const files = [];

function collectJavaScriptFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectJavaScriptFiles(fullPath);
    } else if (entry.name.endsWith(".js") || entry.name.endsWith(".mjs")) {
      files.push(fullPath);
    }
  }
}

for (const root of roots) {
  collectJavaScriptFiles(root);
}

for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const versionJs = readFileSync("src/version.js", "utf8");
if (!versionJs.includes('"' + packageJson.version + '"')) {
  console.error("src/version.js does not match package.json version " + packageJson.version);
  process.exit(1);
}
