import os from "node:os";
import path from "node:path";
import { readFile } from "node:fs/promises";
import { CodexResetsError } from "./errors.js";

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function expandHome(input, homeDir = os.homedir()) {
  if (input === "~") {
    return homeDir;
  }

  if (input.startsWith("~/")) {
    return path.join(homeDir, input.slice(2));
  }

  return input;
}

export function resolveAuthPath({
  authPath = null,
  env = process.env,
  homeDir = os.homedir(),
} = {}) {
  if (typeof authPath === "string" && authPath.trim() !== "") {
    return path.resolve(expandHome(authPath.trim(), homeDir));
  }

  if (typeof env.CODEX_HOME === "string" && env.CODEX_HOME.trim() !== "") {
    return path.join(path.resolve(expandHome(env.CODEX_HOME.trim(), homeDir)), "auth.json");
  }

  return path.join(homeDir, ".codex", "auth.json");
}

export function parseAuthJson(text, source = "auth.json") {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new CodexResetsError("Auth file is not valid JSON: " + source, { cause: error });
  }

  if (!isObject(parsed) || !isObject(parsed.tokens)) {
    throw new CodexResetsError("Auth file is missing tokens object: " + source);
  }

  const accessToken = parsed.tokens.access_token;
  const accountId = parsed.tokens.account_id;

  if (typeof accessToken !== "string" || accessToken.length === 0) {
    throw new CodexResetsError("Auth file contains an empty or invalid access token.");
  }

  if (typeof accountId !== "string" || accountId.length === 0) {
    throw new CodexResetsError("Auth file contains an empty or invalid account ID.");
  }

  return { accessToken, accountId };
}

export async function loadAuth({
  authPath = null,
  env = process.env,
  homeDir = os.homedir(),
  readFileFn = readFile,
} = {}) {
  const resolvedPath = resolveAuthPath({ authPath, env, homeDir });

  let text;
  try {
    text = await readFileFn(resolvedPath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      throw new CodexResetsError("Missing auth file: " + resolvedPath, { cause: error });
    }

    throw new CodexResetsError("Could not read auth file: " + resolvedPath + ": " + error.message, {
      cause: error,
    });
  }

  return {
    ...parseAuthJson(text, resolvedPath),
    authPath: resolvedPath,
  };
}
