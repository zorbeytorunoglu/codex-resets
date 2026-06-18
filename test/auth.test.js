import test from "node:test";
import assert from "node:assert/strict";
import { loadAuth, parseAuthJson, resolveAuthPath } from "../src/auth.js";

test("resolveAuthPath uses explicit auth path first", () => {
  assert.equal(
    resolveAuthPath({
      authPath: "~/custom/auth.json",
      env: { CODEX_HOME: "/ignored" },
      homeDir: "/home/zorbey",
    }),
    "/home/zorbey/custom/auth.json",
  );
});

test("resolveAuthPath falls back to CODEX_HOME", () => {
  assert.equal(
    resolveAuthPath({
      env: { CODEX_HOME: "~/codex-home" },
      homeDir: "/home/zorbey",
    }),
    "/home/zorbey/codex-home/auth.json",
  );
});

test("resolveAuthPath defaults to ~/.codex/auth.json", () => {
  assert.equal(resolveAuthPath({ env: {}, homeDir: "/home/zorbey" }), "/home/zorbey/.codex/auth.json");
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
