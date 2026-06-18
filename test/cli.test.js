import test from "node:test";
import assert from "node:assert/strict";
import { main, parseCliArgs } from "../src/cli.js";

function writer() {
  let text = "";
  return {
    stream: {
      write(chunk) {
        text += chunk;
        return true;
      },
    },
    get text() {
      return text;
    },
  };
}

function fakeFetch(data) {
  return async () => ({
    ok: true,
    status: 200,
    text: async () => JSON.stringify(data),
  });
}

const sample = {
  available_count: 1,
  credits: [
    {
      title: "One free rate limit reset",
      status: "available",
      reset_type: "codex_rate_limits",
      granted_at: "2026-06-12T00:00:00Z",
      expires_at: "2026-07-12T00:00:00Z",
    },
  ],
};

test("parseCliArgs rejects incompatible output modes", () => {
  assert.throws(() => parseCliArgs(["--json", "--raw"]), /either --json or --raw/);
});

test("main prints help without reading auth", async () => {
  const stdout = writer();
  const stderr = writer();
  const exitCode = await main(["--help"], { stdout: stdout.stream, stderr: stderr.stream });
  assert.equal(exitCode, 0);
  assert.match(stdout.text, /Usage: codex-resets/);
  assert.equal(stderr.text, "");
});

test("main prints redacted JSON", async () => {
  const stdout = writer();
  const stderr = writer();
  const exitCode = await main(["--json"], {
    stdout: stdout.stream,
    stderr: stderr.stream,
    env: {},
    homeDir: "/home/zorbey",
    readFileFn: async () =>
      JSON.stringify({
        tokens: {
          access_token: "secret-token",
          account_id: "secret-account",
        },
      }),
    fetchFn: fakeFetch(sample),
    now: new Date("2026-06-13T00:00:00Z"),
  });

  assert.equal(exitCode, 0);
  assert.equal(stderr.text, "");
  assert.equal(stdout.text.includes("secret-token"), false);
  assert.equal(stdout.text.includes("secret-account"), false);
  assert.equal(JSON.parse(stdout.text).availableCount, 1);
});

test("main prints raw response only when requested", async () => {
  const stdout = writer();
  const stderr = writer();
  const exitCode = await main(["--raw"], {
    stdout: stdout.stream,
    stderr: stderr.stream,
    env: {},
    homeDir: "/home/zorbey",
    readFileFn: async () =>
      JSON.stringify({
        tokens: {
          access_token: "secret-token",
          account_id: "secret-account",
        },
      }),
    fetchFn: fakeFetch(sample),
  });

  assert.equal(exitCode, 0);
  assert.match(stderr.text, /raw output/);
  assert.equal(JSON.parse(stdout.text).available_count, 1);
});
