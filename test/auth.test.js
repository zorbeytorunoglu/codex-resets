import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { loadAuth, parseAuthJson, resolveAuthPath } from "../src/auth.js";

test("resolveAuthPath uses explicit auth path first", () => {
  const homeDir = path.resolve("home", "zorbey");
  assert.equal(
    resolveAuthPath({
      authPath: "~/custom/auth.json",
      env: { CODEX_HOME: "/ignored" },
      homeDir,
    }),
    path.join(homeDir, "custom", "auth.json"),
  );
});

test("resolveAuthPath falls back to CODEX_HOME", () => {
  const homeDir = path.resolve("home", "zorbey");
  assert.equal(
    resolveAuthPath({
      env: { CODEX_HOME: "~/codex-home" },
      homeDir,
    }),
    path.join(homeDir, "codex-home", "auth.json"),
  );
});

test("resolveAuthPath defaults to ~/.codex/auth.json", () => {
  const homeDir = path.resolve("home", "zorbey");
  assert.equal(resolveAuthPath({ env: {}, homeDir }), path.join(homeDir, ".codex", "auth.json"));
});

test("parseAuthJson extracts token and account ID", () => {
  assert.deepEqual(
    parseAuthJson(
      JSON.stringify({
        tokens: {
          access_token: "token",
          account_id: "account",
        },
      }),
    ),
    {
      accessToken: "token",
      accountId: "account",
    },
  );
});

test("parseAuthJson rejects missing token fields", () => {
  assert.throws(() => parseAuthJson(JSON.stringify({ tokens: {} })), /access token/);
});

test("loadAuth reports missing files clearly", async () => {
  await assert.rejects(
    loadAuth({
      env: {},
      homeDir: "/home/zorbey",
      readFileFn: async () => {
        const error = new Error("missing");
        error.code = "ENOENT";
        throw error;
      },
    }),
    /Missing auth file/,
  );
});
